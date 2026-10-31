import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { opcoesDeSerie, seriesVisiveis, type ProvaComSerie } from './series';

const prova = (id: number, serie: string | null, equipas: string[]): ProvaComSerie => ({
	competicao: { id, serie },
	dados: { equipas: equipas.map((nome) => ({ nome })) }
});

const sub17 = ['A', 'B', 'C', 'D', 'E', 'F'].map((s, i) => prova(451 + i, s, [`EQUIPA ${s}1`, `EQUIPA ${s}2`]));

describe('a escolha de série', () => {
	it('quem não segue ninguém pode escolher qualquer série — era o que faltava', () => {
		const opcoes = opcoesDeSerie(sub17, new Set());
		expect(opcoes.map((o) => o.rotulo)).toEqual(['Todas', 'A', 'B', 'C', 'D', 'E', 'F']);
		expect(opcoes.some((o) => o.minha)).toBe(false);
	});

	it('a série da favorita fica marcada, mas não escolhida', () => {
		const opcoes = opcoesDeSerie(sub17, new Set(['EQUIPA C2']));
		expect(opcoes.filter((o) => o.minha).map((o) => o.valor)).toEqual(['C']);
		expect(seriesVisiveis(sub17, '')).toHaveLength(6);
	});

	it('escolher uma série mostra só essa', () => {
		expect(seriesVisiveis(sub17, 'D').map((p) => p.competicao.id)).toEqual([454]);
	});

	it('uma série que já não existe mostra todas, e nunca um ecrã vazio', () => {
		expect(seriesVisiveis(sub17, 'Z')).toHaveLength(6);
	});

	it('sem nada a escolher não há fila de botões', () => {
		expect(opcoesDeSerie([prova(1, 'A', ['X'])], new Set())).toEqual([]);
		expect(opcoesDeSerie([prova(1, null, ['X']), prova(2, null, ['Y'])], new Set())).toEqual([]);
	});

	it('pela ordem das letras, mesmo que a APL as liste por outra', () => {
		const baralhadas = [prova(3, 'E', []), prova(2, 'D', [])];
		expect(opcoesDeSerie(baralhadas, new Set()).map((o) => o.valor)).toEqual(['', 'D', 'E']);
	});
});

/**
 * Contra os dados publicados: todas as provas com séries têm uma escolha por série, e cada
 * escolha mostra exactamente uma. Zero pedidos à APL.
 */
describe('com as competições publicadas', () => {
	const raiz = new URL('../../static/v1/aplisboa/', import.meta.url);
	const temporadas = existsSync(raiz) ? readdirSync(raiz).sort().reverse() : [];
	const base = temporadas.length ? new URL(`${temporadas[0]}/`, raiz) : null;
	const ler = (c: string) => JSON.parse(readFileSync(new URL(c, base!), 'utf8'));

	it.skipIf(!base)('cada série de cada prova se pode escolher sozinha', () => {
		const { competicoes } = ler('competitions.json') as {
			competicoes: { id: number; serie?: string | null; grupo_id?: string | null }[];
		};
		const grupos = new Map<string, typeof competicoes>();
		for (const c of competicoes) {
			const g = c.grupo_id ?? String(c.id);
			grupos.set(g, [...(grupos.get(g) ?? []), c]);
		}
		let comSeries = 0;
		for (const series of grupos.values()) {
			if (series.length < 2) continue;
			comSeries += 1;
			const provas = series.map((c) => ({ competicao: c, dados: ler(`comp/${c.id}.json`) }));
			const opcoes = opcoesDeSerie(provas, new Set());
			expect(opcoes).toHaveLength(series.length + 1);
			for (const o of opcoes.slice(1)) expect(seriesVisiveis(provas, o.valor)).toHaveLength(1);
		}
		// a 31/10/2026 eram sete: Sub-19, Sub-17, Sub-15, Sub-13, dois de Escolares e um de Benjamins
		expect(comSeries).toBeGreaterThan(0);
	});
});
