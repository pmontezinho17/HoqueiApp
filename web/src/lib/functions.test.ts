import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Uma Pages Function que o service worker intercepta é uma Function que não existe.
 *
 * O service worker responde a **todas** as navegações com o `index.html`. Para um caminho sem
 * rota no SvelteKit — e uma Function nunca tem rota — o resultado é um **ecrã vazio**: a
 * aplicação carrega e não encontra nada para desenhar.
 *
 * Aconteceu a 09/10/2026, com o dono a abrir `hoquei.pages.dev/consola` e a ver branco. O
 * `/contagens` estava na `navigateFallbackDenylist` desde que nasceu; o `/consola` ficou de
 * fora no dia em que passou a ser servido pelo site, e nada o apanhou — não é um erro de
 * compilação, não é um teste que falha, e no `curl` funciona, porque o `curl` não tem service
 * worker. Só se vê no browser de quem já visitou a app.
 *
 * Este teste fecha a porta: **toda a Function tem de estar na lista, sem excepções.** Há uma
 * que não precisaria — o `/contar` é um `fetch` e não uma navegação — e está lá à mesma, porque
 * uma lista com excepções é uma lista que se discute a cada entrada nova, e foi uma discussão
 * dessas que deixou o `/consola` de fora.
 */
describe('as Pages Functions e o service worker', () => {
	const funcoes = readdirSync(new URL('../../functions', import.meta.url))
		.filter((f) => f.endsWith('.js') && !f.startsWith('_'))
		.map((f) => `/${f.replace(/\.js$/, '')}`);

	const config = readFileSync(new URL('../../vite.config.ts', import.meta.url), 'utf-8');
	const lista =
		config.match(/navigateFallbackDenylist:\s*\[([^\]]*)\]/)?.[1] ?? '';

	it('há Functions para testar, senão este teste não diz nada', () => {
		expect(funcoes.length).toBeGreaterThan(0);
	});

	it('cada Function está na navigateFallbackDenylist do vite.config.ts', () => {
		const faltam = funcoes.filter((c) => !lista.includes(`/^\\${c}/`));
		expect(faltam).toEqual([]);
	});
});
