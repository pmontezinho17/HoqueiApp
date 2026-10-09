import { describe, expect, it } from 'vitest';
import { pagina } from './consola';

/**
 * A consola **desenha-se** — e isso não é óbvio só porque compila.
 *
 * Três vezes num dia a página partiu-se por razões que o `svelte-check` deixou passar e que
 * só apareciam ao abrir o browser:
 *
 * 1. **backticks dentro do template literal.** Um ``à volta de uma palavra`` num comentário
 *    de CSS fecha a string. Aconteceu três vezes, em três comentários diferentes;
 * 2. **uma variável usada antes de ser declarada** — um `const` não é içado, e o erro só
 *    nasce quando a função corre;
 * 3. **uma função que não existia** (`emLisboaCurto`), apanhada pelo tipo mas só porque
 *    calhou.
 *
 * Isto rende a página com dados mínimos e verifica que sai HTML inteiro. Não testa o
 * desenho; testa que há desenho.
 */
const minimo = {
	dia: '2026-10-09',
	dias: ['2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09'],
	estado: null,
	rel: {
		cadencia_s: { mediana: null, minimo: null, maximo: null },
		buracos_acima_de_3min: [],
		resultados: [],
		erros: [],
		publicacoes: 0,
		eventos: 0
	},
	runs: [],
	diario: [],
	ent: {},
	horas: {},
	porDia: {},
	sempre: null,
	entradasHora: {}
};

describe('a consola desenha-se', () => {
	for (const vista of ['utilizadores', 'sistema'] as const) {
		it(`a vista ${vista} sai como HTML inteiro`, () => {
			const html = pagina({ ...minimo, vista, chave: 'abc' });
			expect(html.startsWith('<!doctype html>')).toBe(true);
			expect(html.trimEnd().endsWith('</html>')).toBe(true);
			// se um backtick fechar o template a meio, o fim da página desaparece
			expect(html).toContain('</body>');
			expect(html).toContain('Consola OK4Sticks');
		});
	}

	it('a vista escolhida é a que desenha, e a outra não', () => {
		expect(pagina({ ...minimo, vista: 'sistema' })).toContain('pedidos à APL por hora');
		expect(pagina({ ...minimo, vista: 'utilizadores' })).not.toContain('pedidos à APL por hora');
		expect(pagina({ ...minimo, vista: 'utilizadores' })).toContain('entradas por hora');
	});

	/** Foi este o defeito que o dono apanhou: os links de um gráfico não levavam a vista. */
	it('todos os links internos levam a vista e a chave consigo', () => {
		const html = pagina({ ...minimo, vista: 'sistema', chave: 'abc' });
		const hrefs = [...html.matchAll(/href="(\?[^"]*)"/g)].map((m) => m[1]);
		expect(hrefs.length).toBeGreaterThan(5);
		for (const h of hrefs) {
			expect(h).toContain('chave=abc');
			// o único link que muda de vista é o da própria barra de vistas
			if (!h.includes('vista=sistema')) expect(h).toMatch(/^\?chave=abc$/);
		}
	});

	it('sem dados nenhuns não rebenta, e di-lo em vez de desenhar zeros', () => {
		const html = pagina({ ...minimo, vista: 'utilizadores' });
		expect(html).toContain('Não há horas registadas neste dia');
	});
});
