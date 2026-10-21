import { describe, expect, it } from 'vitest';
import { CICLO, PRIMEIRA_SANCAO, estadoDasFaltas, mostrarNoPlacar } from './faltas';

/**
 * As faltas de equipa no placar. A decisão vive numa função pura e não dentro do `.svelte`, pela
 * regra do `AGENTS.md` que nasceu do Mérito desaparecido: o que um ecrã mostra tem de ser
 * testável sem montar o ecrã.
 */
describe('o estado do contador de faltas', () => {
	it('é normal até às oito', () => {
		for (const n of [0, 1, 5, 8]) expect(estadoDasFaltas(n)).toBe('normal');
	});

	it('às nove avisa que a próxima é livre directo', () => {
		expect(estadoDasFaltas(9)).toBe('alerta');
	});

	it('à décima a sanção é essa', () => {
		expect(estadoDasFaltas(PRIMEIRA_SANCAO)).toBe('atingido');
	});

	it('e depois é de cinco em cinco, não sempre aceso', () => {
		// A regra que o dono trouxe a 17/10/2026: "à 10.ª (e a cada múltiplo de 5 seguinte:
		// 15.ª, 20.ª) é assinalado um livre directo". Um aviso permanente a partir das 9 seria
		// ruído a meio do jogo numa equipa indisciplinada — e um aviso sempre aceso deixa de
		// ser um aviso.
		expect(estadoDasFaltas(14)).toBe('alerta');
		expect(estadoDasFaltas(15)).toBe('atingido');
		expect(estadoDasFaltas(19)).toBe('alerta');
		expect(estadoDasFaltas(20)).toBe('atingido');
		expect(estadoDasFaltas(24)).toBe('alerta');
		expect(estadoDasFaltas(25)).toBe('atingido');
	});

	it('entre uma sanção e o aviso seguinte volta ao normal', () => {
		// Entre a 11.ª e a 13.ª não há nada a avisar: a seguinte está a três faltas.
		for (const n of [11, 12, 13, 16, 17, 18, 21, 22, 23]) {
			expect(estadoDasFaltas(n), `n=${n}`).toBe('normal');
		}
	});

	it('o ciclo é de cinco e está numa constante, não espalhado pelo código', () => {
		expect(CICLO).toBe(5);
		expect(estadoDasFaltas(PRIMEIRA_SANCAO + CICLO)).toBe('atingido');
		expect(estadoDasFaltas(PRIMEIRA_SANCAO + CICLO - 1)).toBe('alerta');
	});

	it('sem número não inventa aviso nenhum', () => {
		// Uma ficha sem faltas publicadas não é um jogo sem faltas, é um jogo sobre o qual não
		// sabemos. A fonte manda `null` nos jogos por começar.
		for (const n of [null, undefined, NaN, -1]) expect(estadoDasFaltas(n)).toBe('normal');
	});
});

describe('quando é que as faltas aparecem no placar', () => {
	it('a partir do momento em que o jogo começou — a decorrer ou já terminado', () => {
		// A 17/10/2026 a regra era "só ao vivo"; a 21/10 o dono alargou-a: "num jogo a decorrer
		// ou finalizado devem aparecer as faltas cometidas por cada equipa". O critério deixou
		// de ser "está a decorrer" e passou a ser "já começou".
		expect(mostrarNoPlacar(true, [4, 3])).toBe(true);
	});

	it('mas não antes do apito inicial', () => {
		// E não é só porque ele o pediu: a fonte publica [null, null] nesses jogos, e um 0–0 de
		// faltas antes do apito seria um número inventado a partir de um campo vazio.
		expect(mostrarNoPlacar(false, [4, 3])).toBe(false);
		expect(mostrarNoPlacar(false, [null, null])).toBe(false);
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
