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
