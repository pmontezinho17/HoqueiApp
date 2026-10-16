import { describe, expect, it } from 'vitest';
import { FALTAS_COM_SANCAO, FALTAS_DE_ALERTA, estadoDasFaltas, mostrarNoPlacar } from './faltas';

/**
 * As faltas de equipa no placar. A decisão vive numa função pura e não dentro do `.svelte`, pela
 * regra do `AGENTS.md` que nasceu do Mérito desaparecido: o que um ecrã mostra tem de ser
 * testável sem montar o ecrã.
 */
describe('o estado do contador de faltas', () => {
	it('é normal abaixo das nove', () => {
		for (const n of [0, 1, 5, 8]) expect(estadoDasFaltas(n)).toBe('normal');
	});

	it('às nove passa a alerta — falta uma para a sanção', () => {
		expect(estadoDasFaltas(FALTAS_DE_ALERTA)).toBe('alerta');
	});

	it('às dez já é a sanção, e o aviso não desaparece', () => {
		// Um número que chega a 10 e perde o destaque seria pior do que não ter destaque
		// nenhum: a partir daqui cada falta seguinte vale a sanção.
		expect(estadoDasFaltas(FALTAS_COM_SANCAO)).toBe('atingido');
		expect(estadoDasFaltas(17)).toBe('atingido');
	});

	it('sem número não inventa aviso nenhum', () => {
		// Uma ficha sem faltas publicadas não é um jogo sem faltas, é um jogo sobre o qual não
		// sabemos. A fonte manda `null` nos jogos por começar.
		for (const n of [null, undefined, NaN, -1]) expect(estadoDasFaltas(n)).toBe('normal');
	});
});

describe('quando é que as faltas aparecem no placar', () => {
	it('só com o jogo a decorrer', () => {
		// Decisão do dono a 17/10/2026. Num jogo terminado continuam na caixa de informação.
		expect(mostrarNoPlacar(true, [4, 3])).toBe(true);
		expect(mostrarNoPlacar(false, [4, 3])).toBe(false);
	});

	it('e só quando há números dos dois lados', () => {
		expect(mostrarNoPlacar(true, [null, null])).toBe(false);
		expect(mostrarNoPlacar(true, [4, null])).toBe(false);
		expect(mostrarNoPlacar(true, null)).toBe(false);
		expect(mostrarNoPlacar(true, undefined)).toBe(false);
	});

	it('zero faltas é um número e mostra-se', () => {
		// `0` é informação: ninguém fez falta nenhuma. Se isto caísse num teste de verdade/
		// falsidade, o placar escondia-se no início de todos os jogos.
		expect(mostrarNoPlacar(true, [0, 0])).toBe(true);
	});
});
