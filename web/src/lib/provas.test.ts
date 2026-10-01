import { describe, expect, it } from 'vitest';
import { provaActual } from './provas';
import type { Jogo } from './tipos';

/** Só interessam a data e o resultado; `disputado()` olha para os golos. */
const jogo = (data: string, gc: number | null = null): Jogo =>
	({ id: 1, jornada: '1', data, hora: '18:00', casa: 'A', fora: 'B',
		golos_casa: gc, golos_fora: gc === null ? null : 0, recinto: null }) as unknown as Jogo;

const HOJE = '2026-10-02';

describe('provaActual', () => {
	it('prefere a prova a meio ao campeonato que ainda não começou', () => {
		expect(provaActual([
			{ id: 10, jogos: [jogo('2026-11-02'), jogo('2026-11-09')] },             // por começar
			{ id: 20, jogos: [jogo('2026-09-20', 3), jogo('2026-10-10')] }           // a meio
		], HOJE)).toBe(20);
	});

	it('entre duas a meio, escolhe a do jogo mais próximo', () => {
		expect(provaActual([
			{ id: 10, jogos: [jogo('2026-09-01', 2), jogo('2026-12-01')] },
			{ id: 20, jogos: [jogo('2026-09-01', 2), jogo('2026-10-04')] }
		], HOJE)).toBe(20);
	});

	it('ignora a prova já terminada, mesmo que venha primeiro', () => {
		expect(provaActual([
			{ id: 10, jogos: [jogo('2026-09-13', 7)] },                              // acabou
			{ id: 20, jogos: [jogo('2026-10-11'), jogo('2026-10-18')] }              // por começar
		], HOJE)).toBe(20);
	});

	it('não deixa uma prova parada passar à frente — jogos por fechar no passado', () => {
		expect(provaActual([
			{ id: 10, jogos: [jogo('2026-09-05', 1), jogo('2026-09-12')] },           // parada
			{ id: 20, jogos: [jogo('2026-09-20', 4), jogo('2026-10-10')] }            // a meio
		], HOJE)).toBe(20);
	});

	it('se tudo acabou, fica a do último jogo disputado', () => {
		expect(provaActual([
			{ id: 10, jogos: [jogo('2026-09-05', 1)] },
			{ id: 20, jogos: [jogo('2026-09-27', 3)] }
		], HOJE)).toBe(20);
	});

	it('um jogo marcado para hoje conta como futuro', () => {
		expect(provaActual([
			{ id: 10, jogos: [jogo('2026-09-05', 1)] },
			{ id: 20, jogos: [jogo(HOJE)] }
		], HOJE)).toBe(20);
	});

	it('sem provas, devolve nulo', () => {
		expect(provaActual([], HOJE)).toBeNull();
	});
});
