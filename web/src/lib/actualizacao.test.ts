import { describe, expect, it } from 'vitest';
import { CAMINHO_VERSAO, decidirAviso, versaoPublicada } from './actualizacao';
import { VERSAO } from './versao';

/**
 * Quando é que uma actualização vale uma interrupção.
 *
 * O porquê e a medição estão no `actualizacao.ts`. O resumo: o service worker acende o aviso
 * sempre que o build muda, e um interruptor que entra **desligado** muda o build sem mudar nada
 * no ecrã — medido, 7 das 123 entradas do manifesto. A versão é a única coisa que diz se houve
 * alteração para quem usa.
 */
describe('decidirAviso', () => {
	it('mesma versão: aplica-se em silêncio', () => {
		expect(decidirAviso('1.1', '1.1')).toBe('calar');
	});

	it('versão diferente: pergunta-se', () => {
		expect(decidirAviso('1.1', '1.2')).toBe('perguntar');
	});

	it('uma versão mais antiga no servidor também pergunta', () => {
		/**
		 * Acontece mesmo: uma publicação revertida, ou um CDN a servir o build anterior num
		 * nó. Perguntar é o comportamento certo — o que está no servidor é o que manda, e
		 * calar-se deixava o aparelho preso numa versão que já não existe.
		 */
		expect(decidirAviso('1.2', '1.1')).toBe('perguntar');
	});

	it('sem conseguir saber: pergunta-se', () => {
		/**
		 * **A rede falhar não pode impedir uma actualização.** Sem isto, uma verificação que
		 * falhasse em silêncio deixava a app sem se actualizar e ninguém descobria — e esse
		 * defeito é muito pior do que um aviso a mais.
		 */
		expect(decidirAviso('1.1', null)).toBe('perguntar');
	});
});

describe('versaoPublicada', () => {
	const resposta = (corpo: unknown, ok = true) =>
		(async () => ({ ok, json: async () => corpo })) as unknown as typeof fetch;

	it('lê o número do ficheiro', async () => {
		expect(await versaoPublicada(resposta({ versao: '1.4' }))).toBe('1.4');
	});

	it('pede sem cache — um número de versão em cache responde à pergunta de há cinco minutos', async () => {
		let opcoes: RequestInit | undefined;
		const espia = (async (_u: string, o: RequestInit) => {
			opcoes = o;
			return { ok: true, json: async () => ({ versao: '1.1' }) };
		}) as unknown as typeof fetch;
		await versaoPublicada(espia);
		expect(opcoes?.cache).toBe('no-store');
	});

	it('não vai a `/v1/`, que o service worker guarda em cache', () => {
		/**
		 * Se este caminho caísse em `/v1/`, a regra de `StaleWhileRevalidate` do service worker
		 * devolvia a cópia antiga — e aí a verificação mentia exactamente quando importava.
		 */
		expect(CAMINHO_VERSAO.startsWith('/v1/')).toBe(false);
		expect(CAMINHO_VERSAO).not.toMatch(/\.(js|css|html|png|ico|svg)$/);
	});

	it('um erro de rede devolve nada, e não estoura', async () => {
		const rebenta = (async () => {
			throw new Error('sem rede');
		}) as unknown as typeof fetch;
		expect(await versaoPublicada(rebenta)).toBe(null);
	});

	it('uma resposta que não serve devolve nada', async () => {
		for (const corpo of [{}, { versao: '' }, { versao: 3 }, null, 'texto'])
			expect(await versaoPublicada(resposta(corpo)), JSON.stringify(corpo)).toBe(null);
		expect(await versaoPublicada(resposta({ versao: '1.1' }, false))).toBe(null);
	});
});

describe('o ficheiro gerado na construção', () => {
	/**
	 * O `/versao.json` é emitido pelo `vite.config.ts` a partir da mesma constante que vai no
	 * pacote, e por isso não pode divergir. Este teste existe para o caso de alguém o trocar por
	 * um ficheiro escrito à mão em `static/`: aí passava a haver duas verdades, e o sintoma era
	 * silencioso — ou avisos a mais para sempre, ou uma app que nunca avisa.
	 */
	it('não existe uma cópia escrita à mão em static/', async () => {
		const { existsSync } = await import('node:fs');
		expect(existsSync(new URL('../../static/versao.json', import.meta.url))).toBe(false);
	});

	// o terceiro número é o das reparações a meio da semana, como a 1.9.1: ver `versao.ts`
	it('a versão compilada é uma versão', () => {
		expect(VERSAO).toMatch(/^\d+\.\d+(\.\d+)?$/);
	});
});
