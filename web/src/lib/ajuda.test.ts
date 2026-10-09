import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PERGUNTAS } from './ajuda';
import { CONTACTO } from './contacto';

/**
 * O FAQ não apodrece em silêncio.
 *
 * O risco de um FAQ escrito do lado de dentro não é escrevê-lo mal: é ele deixar de ser
 * verdade sem ninguém notar. Metade das respostas aponta para outras páginas da app, e um
 * `href` que deixe de existir dá um link morto numa página que ninguém relê.
 *
 * **As rotas são lidas do disco e não escritas aqui à mão.** Uma lista de rotas copiada para
 * um teste tem exactamente o mesmo problema que o teste tenta resolver.
 */
const ROTAS = new Set(
	readdirSync(new URL('../routes', import.meta.url), { withFileTypes: true })
		.filter((e) => e.isDirectory() && !e.name.startsWith('.'))
		.map((e) => `/${e.name}`)
);

describe('as perguntas frequentes', () => {
	it('começa curta: dez a quinze, não trinta', () => {
		// o limite de baixo é para não se esvaziar sem se dar conta; o de cima é a regra do
		// pedido — uma lista comprida de perguntas que ninguém fez esconde as que importam
		expect(PERGUNTAS.length).toBeGreaterThanOrEqual(10);
		expect(PERGUNTAS.length).toBeLessThanOrEqual(15);
	});

	it('cada caminho interno de cada resposta é uma rota que existe', () => {
		const mortos: string[] = [];
		for (const { p, r } of PERGUNTAS) {
			for (const [, href] of r.matchAll(/href="([^"]+)"/g)) {
				if (href.startsWith('mailto:')) continue;
				// `/clube` e `/clube/algo` contam os dois como a rota `/clube`
				const raiz = `/${href.split('/')[1]}`;
				if (!ROTAS.has(raiz)) mortos.push(`${p} → ${href}`);
			}
		}
		expect(mortos).toEqual([]);
	});

	it('o endereço de contacto vem do contacto.ts e não escrito à mão', () => {
		const comMailto = PERGUNTAS.filter((q) => q.r.includes('mailto:'));
		expect(comMailto.length).toBeGreaterThan(0);
		for (const q of comMailto) expect(q.r).toContain(`mailto:${CONTACTO}`);
	});

	it('nenhuma pergunta repetida, e todas acabam em interrogação', () => {
		expect(new Set(PERGUNTAS.map((q) => q.p)).size).toBe(PERGUNTAS.length);
		for (const q of PERGUNTAS) expect(q.p.endsWith('?')).toBe(true);
	});

	/**
	 * As respostas que dependem de coisas que vão mudar não repetem o número: apontam para o
	 * sítio onde a verdade vive. "A última actualização está em Sobre a app" continua verdade
	 * depois de a cadência mudar; "actualiza de 30 em 30 segundos" não.
	 */
	it('a resposta da cadência não escreve números que o dados.yml pode mudar', () => {
		const cadencia = PERGUNTAS.find((q) => q.p.includes('quanto tempo'));
		expect(cadencia).toBeDefined();
		expect(cadencia!.r).not.toMatch(/\d+\s*(s|seg|segundos|min|minutos|horas?)\b/);
		// e manda quem a lê ao sítio onde está a hora a sério
		expect(cadencia!.r).toContain('/mais');
	});
});
