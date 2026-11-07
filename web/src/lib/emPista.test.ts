import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { emPistaDoJogo } from './emPista';
import type { AtletaEmPista, FichaJogo } from './tipos';

const atleta = (numero: string, marcas: string[], golos: number[] | null = [0, 0, 0, 0], gr = false): AtletaEmPista =>
	({ numero, nome: `ATLETA ${numero}`, gr, marcas, golos });

describe('emPistaDoJogo', () => {
	it('sem grelha não há separador', () => {
		expect(emPistaDoJogo({})).toBeNull();
		expect(emPistaDoJogo({ em_pista: null })).toBeNull();
		expect(emPistaDoJogo({ em_pista: [{ equipa: 'A', atletas: [] }, { equipa: 'B', atletas: [] }] })).toBeNull();
	});

	it('o J é quem entrou a meio, e conta como período jogado', () => {
		const [casa] = emPistaDoJogo({
			em_pista: [
				{ equipa: 'A', atletas: [atleta('6', ['', 'X', 'X', 'J'], [0, 0, 0, 1])] },
				{ equipa: 'B', atletas: [] }
			]
		})!;
		expect(casa.linhas[0].periodos.map((p) => p.estado)).toEqual(['fora', 'jogou', 'jogou', 'entrou']);
		expect(casa.entradas).toEqual([{ nome: 'ATLETA 6', periodo: 4 }]);
		expect(casa.semAsDuasPartes).toBe(0);
	});

	it('os golos de um período vão em número, e o total soma-os', () => {
		const [casa] = emPistaDoJogo({
			em_pista: [{ equipa: 'A', atletas: [atleta('7', ['', 'X', '', 'X'], [0, 3, 0, 7])] }, { equipa: 'B', atletas: [] }]
		})!;
		expect(casa.linhas[0].periodos.map((p) => p.golos)).toEqual([0, 3, 0, 7]);
		expect(casa.linhas[0].golos).toBe(10);
	});

	it('sem golos por período, o total fica por dizer em vez de dizer zero', () => {
		const [casa] = emPistaDoJogo({
			em_pista: [{ equipa: 'A', atletas: [atleta('7', ['X', '', 'X', ''], null)] }, { equipa: 'B', atletas: [] }]
		})!;
		expect(casa.linhas[0].golos).toBeNull();
	});

	it('conta quem não jogou nas duas partes — o 87.º 7.4', () => {
		const [casa] = emPistaDoJogo({
			em_pista: [
				{ equipa: 'A', atletas: [atleta('1', ['X', '', 'X', '']), atleta('9', ['', 'X', '', ''])] },
				{ equipa: 'B', atletas: [] }
			]
		})!;
		expect(casa.semAsDuasPartes).toBe(1);
	});

	it('qualquer marca da mesa conta como jogada, e não só o X maiúsculo', () => {
		const [casa] = emPistaDoJogo({
			em_pista: [{ equipa: 'A', atletas: [atleta('1', ['x', '', ' X ', ''])] }, { equipa: 'B', atletas: [] }]
		})!;
		expect(casa.linhas[0].periodos.map((p) => p.estado)).toEqual(['jogou', 'fora', 'jogou', 'fora']);
	});
});

describe('as fichas publicadas com a grelha', () => {
	const pasta = new URL('../../static/v1/aplisboa/2026-27/match/', import.meta.url);
	const fichas: FichaJogo[] = existsSync(pasta)
		? readdirSync(pasta)
				.map((n) => JSON.parse(readFileSync(new URL(n, pasta), 'utf-8')) as FichaJogo)
				.filter((f) => f.em_pista)
		: [];

	/**
	 * Vazio até a primeira ronda com o raspador de 07/11/2026 passar pelas fichas: as 62 da
	 * releitura semanal e as 47 pedidas uma vez (`_em_pista_por_preencher`, no `cli.py`).
	 */
	it.skipIf(!fichas.length)('só nos Escolares e Benjamins', () => {
		for (const f of fichas) expect(['ESCOLARES', 'BENJAMINS'], `jogo ${f.id}`).toContain(f.categoria);
	});

	it.skipIf(!fichas.length)('cada uma dá o separador, com as duas equipas do jogo', () => {
		for (const f of fichas) {
			const e = emPistaDoJogo(f);
			expect(e, `jogo ${f.id}`).not.toBeNull();
			expect(e!.map((x) => x.equipa)).toEqual([f.casa, f.fora]);
		}
	});

	it.skipIf(!fichas.length)('os golos do separador batem com o resultado', () => {
		for (const f of fichas) {
			const e = emPistaDoJogo(f)!;
			if (e.some((x) => x.linhas.some((l) => l.golos === null))) continue;
			const soma = (i: number) => e[i].linhas.reduce((s, l) => s + (l.golos ?? 0), 0);
			// menos ou igual: um golo sem marcador na cronologia não é de atleta nenhum
			expect(soma(0), `jogo ${f.id}`).toBeLessThanOrEqual(f.golos_casa ?? 0);
			expect(soma(1), `jogo ${f.id}`).toBeLessThanOrEqual(f.golos_fora ?? 0);
		}
	});

	it.skipIf(!fichas.length)('nenhuma traz a licença de um atleta', () => {
		for (const f of fichas) expect(JSON.stringify(f.em_pista), `jogo ${f.id}`).not.toContain('"licenca"');
	});
});
