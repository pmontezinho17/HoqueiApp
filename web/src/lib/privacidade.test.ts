import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * A página de privacidade enumera o que fica guardado no aparelho — e isso é uma promessa,
 * não uma descrição. **Uma chave nova que não apareça lá torna a página falsa no instante em
 * que é publicada.**
 *
 * Já aconteceu duas vezes. A primeira foi minha, a 06/10/2026: a página dizia uma chave e
 * havia duas, porque o `guia-visto` nasceu sem passar por lá. A segunda ia acontecer hoje, com
 * a chave da consola.
 *
 * O AGENTS.md diz "código e documento no mesmo commit quando o documento afirma algo sobre o
 * código", e dá esta página como exemplo. Isto é essa regra a deixar de depender de memória.
 *
 * **Varre o código e não uma lista escrita aqui**, pela mesma razão do teste do FAQ: uma lista
 * copiada para um teste tem exactamente o problema que o teste tenta resolver.
 */
describe('a política de privacidade enumera o que é guardado', () => {
	const pagina = readFileSync(
		new URL('../routes/privacidade/+page.svelte', import.meta.url),
		'utf-8'
	);

	/** Todos os ficheiros de código da app e das Functions. */
	function fontes(dir: URL): string[] {
		return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
			const filho = new URL(`${e.name}${e.isDirectory() ? '/' : ''}`, dir);
			if (e.isDirectory()) return fontes(filho);
			if (!/\.(ts|js|svelte)$/.test(e.name) || e.name.includes('.test.')) return [];
			return [readFileSync(filho, 'utf-8')];
		});
	}

	const codigo = [
		...fontes(new URL('../', import.meta.url)),
		...fontes(new URL('../../functions/', import.meta.url))
	].join('\n');

	// as chaves como elas aparecem no código: 'hoquei:…' ou 'ok4sticks:…'
	const chaves = [
		...new Set([...codigo.matchAll(/['"`]((?:hoquei|ok4sticks):[a-z0-9:-]+)['"`]/g)].map((m) => m[1]))
	];

	it('encontra chaves no código, senão este teste não diz nada', () => {
		expect(chaves.length).toBeGreaterThanOrEqual(5);
	});

	it('cada chave usada pelo código está escrita na página', () => {
		// a `CHAVE_ANTIGA` do guia é a excepção declarada: o código só a **apaga**, e uma
		// página de privacidade a enumerar uma chave que já não se escreve confundia mais do
		// que esclarecia
		const apagadas = new Set(['guia-visto']);
		const faltam = chaves.filter((c) => !apagadas.has(c) && !pagina.includes(c));
		expect(faltam).toEqual([]);
	});

	it('continua a prometer zero cookies, e nada no código escreve um', () => {
		expect(pagina).toMatch(/cookie/i);
		// `document.cookie` em qualquer sítio da app quebrava a promessa da página
		expect(codigo).not.toMatch(/document\.cookie\s*=/);
	});
});
