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
/** As Functions que existem, lidas da pasta — nunca uma lista escrita à mão. */
const funcoes = readdirSync(new URL('../../functions', import.meta.url))
	.filter((f) => f.endsWith('.js') && !f.startsWith('_'))
	.map((f) => `/${f.replace(/\.js$/, '')}`);

describe('as Pages Functions e o service worker', () => {
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

/**
 * **O encaminhamento das Functions, e o guarda que a avaria de 13/10/2026 pagou.**
 *
 * O `_routes.json` diz à Cloudflare que caminhos invocam uma Function. Tinha `include: ["/*"]`
 * com umas exclusões, e isso significava que **cada pedido ao site** — cada página, e cada
 * sondagem de dados de cada telemóvel, de 5 em 5 minutos e de 30 em 30 segundos durante os
 * jogos — invocava o middleware.
 *
 * No plano grátis, cada uma dessas invocações conta para os **100 000 pedidos por dia** da
 * conta Workers, e o modo por omissão é *fail open*: esgotado o limite, a Cloudflare **ignora
 * as Functions** e serve só os ficheiros estáticos. Foi a avaria que o dono encontrou duas
 * vezes a 13/10 — sem consola, sem contador, links directos a dar 404 e o `/v1/*` de volta à
 * cache por omissão de sete dias —, e que durou 18 horas na primeira vez.
 *
 * **O `/v1/*` é o contrato de dados e é de longe o caminho mais pedido do site.** Tirá-lo das
 * Functions custou o contador de "aberturas" e devolveu a resiliência: os dados passam a ser
 * servidos pelos ficheiros estáticos, que a documentação diz serem gratuitos e ilimitados.
 *
 * Este teste existe porque voltar a pôr o `/v1/*` nas Functions é uma linha, e o sintoma
 * demora horas a aparecer.
 */
describe('o encaminhamento das Functions', () => {
	const rotas = JSON.parse(
		readFileSync(new URL('../../static/_routes.json', import.meta.url), 'utf-8')
	) as { version: number; include: string[]; exclude: string[] };

	it('o contrato de dados não invoca Functions', () => {
		expect(rotas.exclude).toContain('/v1/*');
	});

	it('os caminhos mais pedidos a seguir também não', () => {
		// o pacote da app e as imagens: muitos pedidos, nada para decidir
		for (const c of ['/_app/*', '/emblemas/*', '/icones/*', '/escaloes/*'])
			expect(rotas.exclude, c).toContain(c);
	});

	it('mas as Functions continuam a ser alcançáveis', () => {
		/**
		 * O contrário do defeito: excluir de mais deixava o `/consola` e o `/contar` sem
		 * ninguém a responder — que é, do lado de quem usa, a mesma avaria.
		 */
		expect(rotas.include).toContain('/*');
		for (const f of funcoes) expect(rotas.exclude).not.toContain(`/${f}`);
	});
});
