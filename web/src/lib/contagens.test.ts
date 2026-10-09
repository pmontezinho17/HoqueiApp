import { describe, expect, it } from 'vitest';
// JavaScript puro e tipado por JSDoc: é o próprio ficheiro que corre na Cloudflare
import { AMOSTRA, ecraDe, oQueContar } from '../../functions/_middleware.js';

const pedido = (url: string, cabecalhos: Record<string, string> = {}, method = 'GET') =>
	new Request(`https://hoquei.pages.dev${url}`, { method, headers: cabecalhos });

const navegacao = (url: string) => pedido(url, { 'Sec-Fetch-Mode': 'navigate' });

/**
 * Testa o **próprio ficheiro** que corre na Cloudflare, e não uma cópia da sua lógica: é
 * importado de `functions/`. Uma segunda implementação para testar não testa nada.
 */
describe('o que o contador do servidor conta', () => {
	it('agrega os segmentos variáveis: uma equipa não é uma chave', () => {
		expect(ecraDe('/equipa/sub-13/parede-fc-a')).toBe('/equipa');
		expect(ecraDe('/jogo/9547')).toBe('/jogo');
		expect(ecraDe('/competicoes/sub-17')).toBe('/competicoes');
		expect(ecraDe('/')).toBe('/');
		expect(ecraDe('/index.html')).toBe('/');
		// as rotas pré-renderizadas chegam com `.html` e são o mesmo ecrã
		expect(ecraDe('/clube.html')).toBe('/clube');
		expect(ecraDe('/qualquer-coisa')).toBe('outro');
	});

	it('conta a navegação de quem abre um ecrã', () => {
		expect(oQueContar(navegacao('/clube'))).toBe('/clube');
		expect(oQueContar(pedido('/mais', { Accept: 'text/html,*/*' }))).toBe('/mais');
	});

	it('não conta ficheiros de dados nem imagens', () => {
		expect(oQueContar(pedido('/v1/aplisboa/2026-27/agenda.json'))).toBe(null);
		expect(oQueContar(pedido('/emblemas/123.png'))).toBe(null);
		expect(oQueContar(pedido('/v1/aplisboa/2026-27/team/sub-13--caco-b.ics'))).toBe(null);
	});

	/**
	 * O `meta.json` é o único sinal que atravessa o service worker — ver o comentário do
	 * `_middleware.js`. Conta-se 1 em `AMOSTRA` para não mandar dezenas de milhar de escritas
	 * à mesma linha da tabela num sábado cheio — era um tecto do KV e hoje é uma escolha.
	 */
	it('o meta.json conta por amostragem, e nunca mais do que 1 em AMOSTRA', () => {
		const p = pedido('/v1/aplisboa/2026-27/meta.json');
		expect(oQueContar(p, () => 0)).toBe('aberturas');
		expect(oQueContar(p, () => 1 / AMOSTRA)).toBe(null);
		expect(oQueContar(p, () => 0.99)).toBe(null);
	});

	it('o meta.json de outra época também conta: a época está no caminho', () => {
		expect(oQueContar(pedido('/v1/aplisboa/2027-28/meta.json'), () => 0)).toBe('aberturas');
	});

	it('um POST não conta nada', () => {
		expect(oQueContar(pedido('/clube', { 'Sec-Fetch-Mode': 'navigate' }, 'POST'))).toBe(null);
	});
});

/**
 * O instrumento não se mede a si mesmo.
 *
 * O Worker observador lê o `meta.json` de minuto a minuto durante as janelas de jogos e o
 * `scripts/observar.py` lê-o de 20 em 20 segundos. Ambos atravessam esta Function, e até
 * 09/10/2026 contavam como aberturas: das 150 estimadas desse dia, ~50 eram o nosso próprio
 * observador. Um número que cresce quando se olha mais para ele não serve para nada.
 */
describe('os nossos próprios agentes não contam', () => {
	const nosso = (ua: string) =>
		oQueContar(
			new Request('https://hoquei.pages.dev/v1/aplisboa/2026-27/meta.json', {
				headers: { 'User-Agent': ua }
			}),
			() => 0 // o sorteio garante que, sem a regra do agente, isto contava
		);

	it('o observador, o script de observação e a sonda ficam de fora', () => {
		expect(nosso('hoqueiAPP-observador/1.0 (+https://github.com/pmontezinho17/HoqueiApp)')).toBe(null);
		expect(nosso('hoqueiAPP-research/0.1')).toBe(null);
		expect(nosso('hoqueiAPP-ci')).toBe(null);
		expect(nosso('hoqueiAPP/0.1')).toBe(null);
	});

	it('um telemóvel a sério continua a contar', () => {
		expect(nosso('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')).toBe('aberturas');
		// e sem User-Agent nenhum também conta: não se presume que seja nosso
		expect(nosso('')).toBe('aberturas');
	});

	it('o prefixo é o que manda, e não o nome inteiro', () => {
		// um agente nosso que ainda não exista, com o mesmo prefixo, já fica de fora
		expect(nosso('hoqueiAPP-qualquer-coisa-nova/9')).toBe(null);
		// e um agente de fora que mencione o nome no fim não é nosso
		expect(nosso('AlgumBot/1.0 (compatible; hoqueiAPP)')).toBe('aberturas');
	});

	it('as navegações de um agente nosso também não contam', () => {
		expect(
			oQueContar(
				new Request('https://hoquei.pages.dev/clube', {
					headers: { 'User-Agent': 'hoqueiAPP-observador/1.0', 'Sec-Fetch-Mode': 'navigate' }
				})
			)
		).toBe(null);
	});
});
