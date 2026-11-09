import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { emPistaDoJogo, golosEAssistencias, linhaDoJogador } from './emPista';
import type { AtletaEmPista, FichaJogo } from './tipos';

const atleta = (numero: string, marcas: string[], golos: number[] | null = [0, 0, 0, 0], gr = false): AtletaEmPista =>
	({ numero, nome: `ATLETA ${numero}`, gr, marcas, golos });

describe('emPistaDoJogo', () => {
	it('sem grelha a tabela das Equipas fica como sempre', () => {
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

	it('qualquer marca da mesa conta como jogada, e não só o X maiúsculo', () => {
		const [casa] = emPistaDoJogo({
			em_pista: [{ equipa: 'A', atletas: [atleta('1', ['x', '', ' X ', ''])] }, { equipa: 'B', atletas: [] }]
		})!;
		expect(casa.linhas[0].periodos.map((p) => p.estado)).toEqual(['jogou', 'fora', 'jogou', 'fora']);
	});
});

describe('linhaDoJogador', () => {
	const [casa] = emPistaDoJogo({
		em_pista: [{ equipa: 'A', atletas: [atleta('6', ['X', '', 'X', '']), atleta('9', ['', 'X', '', 'X'])] }, { equipa: 'B', atletas: [] }]
	})!;

	it('liga pelo nome', () => {
		expect(linhaDoJogador(casa, { nome: 'ATLETA 9', numero: '1' })?.numero).toBe('9');
	});

	it('e pela camisola quando o nome não bate', () => {
		expect(linhaDoJogador(casa, { nome: 'OUTRA GRAFIA', numero: '6' })?.nome).toBe('ATLETA 6');
	});

	it('e sem nenhum dos dois não inventa', () => {
		expect(linhaDoJogador(casa, { nome: 'NINGUEM', numero: null })).toBeNull();
		expect(linhaDoJogador(casa, { nome: 'NINGUEM', numero: '4' })).toBeNull();
	});
});

describe('golosEAssistencias', () => {
	it('junta as duas numa célula, e só diz o que houve', () => {
		expect(golosEAssistencias({ golos: 1, assistencias: 1 })).toBe('1G/1A');
		expect(golosEAssistencias({ golos: 3, assistencias: 0 })).toBe('3G');
		expect(golosEAssistencias({ golos: 0, assistencias: 2 })).toBe('2A');
		expect(golosEAssistencias({ golos: null, assistencias: null })).toBe('–');
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

	it.skipIf(!fichas.length)('cada uma dá a grelha, com as duas equipas do jogo', () => {
		for (const f of fichas) {
			const e = emPistaDoJogo(f);
			expect(e, `jogo ${f.id}`).not.toBeNull();
			expect(e!.map((x) => x.equipa)).toEqual([f.casa, f.fora]);
		}
	});

	/**
	 * A grelha vive dentro da tabela das Equipas, que vem de outra tabela da ficha: um atleta
	 * da grelha sem linha na tabela desaparecia sem ninguém dar por isso.
	 */
	it.skipIf(!fichas.length)('cada atleta da grelha tem a sua linha na tabela das Equipas', () => {
		for (const f of fichas) {
			for (const e of emPistaDoJogo(f)!) {
				const tabela = (f.equipas ?? []).find((x) => x.nome === e.equipa);
				expect(tabela, `jogo ${f.id}, ${e.equipa}`).toBeDefined();
				const ligadas = tabela!.jogadores.filter((j) => !j.papel).map((j) => linhaDoJogador(e, j));
				for (const l of e.linhas) expect(ligadas, `jogo ${f.id}, ${l.nome}`).toContain(l);
			}
		}
	});

	it.skipIf(!fichas.length)('os golos da grelha batem com o resultado', () => {
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
