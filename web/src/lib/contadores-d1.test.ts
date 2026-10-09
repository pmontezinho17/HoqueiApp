import { describe, expect, it } from 'vitest';
// os próprios ficheiros que correm na Cloudflare, não uma cópia da sua lógica
import { onRequest } from '../../functions/_middleware.js';
import { onRequestGet as contar } from '../../functions/contar.js';
import { onRequestGet as ler } from '../../functions/contagens.js';

/**
 * As escritas dos contadores, agora que são SQL.
 *
 * **Porque é que isto vale um teste e as chaves do KV não valiam:** uma chave errada perdia
 * uma contagem, e uma contagem perdida não é motivo para nada. Uma instrução SQL errada
 * atira — e, pior, uma instrução *certa mas incompleta* escreve na linha errada em silêncio.
 * O que estes testes fixam é a forma do comando: o `ON CONFLICT` que faz a soma, e os valores
 * que lhe são ligados pela ordem certa.
 *
 * Foi verificado assim, e não com um `wrangler pages dev`, porque isto fica a correr para
 * sempre: um servidor local a mão prova uma vez e não protege o próximo que passar aqui.
 */

/** Um D1 de mentira que guarda o que lhe mandaram, e nada mais. */
function d1Falso({ atira = false } = {}) {
	/** @type {{ sql: string; valores: unknown[] }[]} */
	const escritas: { sql: string; valores: unknown[] }[] = [];
	const declaracao = (sql: string) => ({
		bind: (...valores: unknown[]) => ({
			run: async () => {
				if (atira) throw new Error('D1_ERROR: sem ligação');
				escritas.push({ sql, valores });
				return { success: true };
			}
		})
	});
	return { escritas, prepare: declaracao };
}

/**
 * O contexto que a Cloudflare passa a uma Function, com o `waitUntil` a ser coleccionável.
 *
 * O `env` sai daqui com o tipo que a Function declara. O duplo de D1 só implementa o que
 * estes caminhos usam — `prepare`/`bind`/`run` e `batch` — e não as dezenas de métodos de um
 * `D1Database` a sério; forçar o tipo aqui, num ficheiro de teste, é mais honesto do que
 * alargar a assinatura da Function para caber num duplo.
 */
function contexto(url: string, env: unknown, cabecalhos: Record<string, string> = {}) {
	const esperas: Promise<unknown>[] = [];
	return {
		pedido: {
			request: new Request(`https://hoquei.pages.dev${url}`, { headers: cabecalhos }),
			env: env as { DADOS?: import('@cloudflare/workers-types').D1Database },
			next: async () => new Response('ok'),
			waitUntil: (p: Promise<unknown>) => void esperas.push(p)
		},
		// a contagem corre **depois** de a resposta sair: é isso que o `waitUntil` garante, e
		// é por isso que o teste tem de esperar por ele à mão
		acabar: () => Promise.all(esperas)
	};
}

describe('o contador de ecrãs escreve na tabela visita', () => {
	it('soma um à linha do dia e do ecrã, sem a substituir', async () => {
		const bd = d1Falso();
		const { pedido, acabar } = contexto('/clube', { DADOS: bd }, { 'Sec-Fetch-Mode': 'navigate' });
		const r = await onRequest(pedido);
		await acabar();

		expect(r.status).toBe(200);
		expect(bd.escritas).toHaveLength(1);
		// a soma tem de estar no comando: um `INSERT` simples rebentava na segunda visita e um
		// `REPLACE` punha o contador a 1 outra vez
		expect(bd.escritas[0].sql).toMatch(/ON CONFLICT \(dia, ecra\) DO UPDATE SET n = n \+ 1/);
		expect(bd.escritas[0].valores[1]).toBe('/clube');
		// a data de Lisboa, com os dois dígitos: 'AAAA-MM-DD'
		expect(bd.escritas[0].valores[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});

	it('sem ligação à base de dados serve a página e não conta', async () => {
		const { pedido, acabar } = contexto('/clube', {}, { 'Sec-Fetch-Mode': 'navigate' });
		const r = await onRequest(pedido);
		await acabar();
		expect(r.status).toBe(200);
	});

	it('um erro da base de dados não chega ao ecrã de ninguém', async () => {
		const bd = d1Falso({ atira: true });
		const { pedido, acabar } = contexto('/jogo/1', { DADOS: bd }, { 'Sec-Fetch-Mode': 'navigate' });
		const r = await onRequest(pedido);
		await expect(acabar()).resolves.toBeDefined();
		expect(r.status).toBe(200);
	});
});

describe('o contador de aparelhos escreve na tabela aparelho', () => {
	it('um aparelho novo soma um ao total e um aos novos', async () => {
		const bd = d1Falso();
		const { pedido, acabar } = contexto('/contar?novo=1', { DADOS: bd });
		const r = await contar(pedido);
		await acabar();

		expect(r.status).toBe(204);
		expect(bd.escritas[0].sql).toMatch(/total = total \+ 1, novos = novos \+ \?/);
		// o `1` aparece duas vezes de propósito: uma no `VALUES` do primeiro aparelho do dia,
		// outra no `DO UPDATE` dos seguintes
		expect(bd.escritas[0].valores.slice(1)).toEqual([1, 1]);
	});

	it('um aparelho conhecido soma ao total e não aos novos', async () => {
		const bd = d1Falso();
		const { pedido, acabar } = contexto('/contar?novo=0', { DADOS: bd });
		await contar(pedido);
		await acabar();
		expect(bd.escritas[0].valores.slice(1)).toEqual([0, 0]);
	});

	it('responde 204 sem corpo mesmo sem base de dados ligada', async () => {
		const { pedido } = contexto('/contar?novo=1', {});
		const r = await contar(pedido);
		expect(r.status).toBe(204);
		expect(await r.text()).toBe('');
	});
});

describe('o endereço de leitura das contagens', () => {
	/** Um D1 de mentira que responde a um `batch` com as linhas que lhe dermos. */
	const d1Lido = (visitas: unknown[], aparelhos: unknown[]) =>
		({
			prepare: () => ({ bind: () => ({}) }),
			batch: async () => [{ results: visitas }, { results: aparelhos }]
		}) as unknown as import('@cloudflare/workers-types').D1Database;

	it('sem chave não admite que existe', async () => {
		const r = await ler({
			request: new Request('https://hoquei.pages.dev/contagens'),
			env: { CHAVE_CONTAGENS: 'certa', DADOS: d1Lido([], []) }
		});
		// 404 e não 403: um 403 confirmava o endereço a quem o andasse a sondar
		expect(r.status).toBe(404);
	});

	it('multiplica as aberturas por 10 e deixa os ecrãs como estão', async () => {
		const r = await ler({
			request: new Request('https://hoquei.pages.dev/contagens?chave=certa&dias=2'),
			env: {
				CHAVE_CONTAGENS: 'certa',
				DADOS: d1Lido(
					[
						{ dia: '2026-10-08', ecra: 'aberturas', n: 69 },
						{ dia: '2026-10-08', ecra: '/clube', n: 18 }
					],
					[{ dia: '2026-10-08', total: 14, novos: 12 }]
				)
			}
		});
		const d = (
			await r.json()
		) as { dias: Record<string, Record<string, number>> };
		// a amostra é 1 em 10: guardar 69 e mostrar 69 seria mentir por omissão
		expect(d.dias['2026-10-08'].aberturas).toBe(690);
		expect(d.dias['2026-10-08']['/clube']).toBe(18);
		expect(d.dias['2026-10-08'].aparelhos).toBe(14);
		expect(d.dias['2026-10-08'].novos).toBe(12);
	});
});
