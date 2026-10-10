/**
 * A cor escolhível, e a partilha. Dois pedidos do dono a 10/10/2026, testados onde são puros.
 */
import { describe, expect, it } from 'vitest';
import { CORES, OMISSAO, interpretar } from './cor.svelte';
import { ENDERECO, TEXTO } from './partilha';
import { PRODUCAO } from './ambiente.js';

describe('a cor escolhida', () => {
	it('o que não é uma cor da paleta cai no verde', () => {
		for (const cru of [null, '', 'dourado', 'VERDE', '#ff0000'])
			expect(interpretar(cru), JSON.stringify(cru)).toBe(OMISSAO);
	});

	it('uma cor da paleta é aceite tal e qual', () => {
		for (const c of CORES) expect(interpretar(c.valor)).toBe(c.valor);
	});

	it('o verde é a omissão, e é o verde que a app sempre teve', () => {
		expect(OMISSAO).toBe('verde');
		expect(CORES[0].claro).toBe('#0a7d54');
		expect(CORES[0].escuro).toBe('#34d399');
	});

	it('cada cor traz os quatro valores, e todos são cores', () => {
		/**
		 * Faltar um dava um `var()` sem valor e o acento caía no fallback **de um tema só** —
		 * uma app azul no claro e verde no escuro. O defeito era silencioso: nada rebenta.
		 */
		for (const c of CORES)
			for (const campo of ['claro', 'escuro', 'fracoClaro', 'fracoEscuro'] as const)
				expect(c[campo], `${c.valor}.${campo}`).toMatch(/^#[0-9a-f]{6}$/);
	});

	it('todas têm nome legível, que é o que quem lê por voz ouve', () => {
		for (const c of CORES) expect(c.rotulo.trim()).not.toBe('');
	});

	it('há cores que cheguem para valer a pena, e não tantas que não se escolha', () => {
		expect(CORES.length).toBeGreaterThanOrEqual(4);
		expect(CORES.length).toBeLessThanOrEqual(8);
	});
});

describe('partilhar a aplicação', () => {
	/**
	 * O endereço é sempre o de produção, nunca o da barra. Foi o dono que, na manhã deste
	 * mesmo dia, partilhou o endereço do site de testes por não ter nada à mão que
	 * partilhasse o certo — e um botão de partilha que copiasse `location.href` repetia o
	 * engano a partir de um site de ramo.
	 */
	it('partilha produção, e não o endereço onde a pessoa está', () => {
		expect(ENDERECO).toBe(`https://${PRODUCAO}`);
		expect(ENDERECO).not.toContain('testes');
	});

	it('leva uma frase que diz o que a app é', () => {
		expect(TEXTO).toMatch(/h[óo]quei/i);
		expect(TEXTO.length).toBeGreaterThan(40);
	});
});
