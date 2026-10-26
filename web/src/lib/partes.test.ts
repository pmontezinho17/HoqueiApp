import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { boletimDaCronologia, boletimPorPartes, daMetade, partesNaCronologia } from './partes';
import type { Boletim, EventoJogo, FichaJogo } from './tipos';

/**
 * **Um jogo de quatro partes mostra quatro partes.** Apanhado por um treinador a 26/10/2026, na
 * ficha de um jogo de Escolares que mostrava duas. O porquê, e a medição, estão em `partes.ts`.
 *
 * A primeira metade corre contra os jogos **publicados**, porque a pergunta é se a regra
 * aguenta os dados que existem; a segunda fixa os casos em que ela tem de recusar.
 */
describe('as partes de cada jogo publicado', () => {
	const raiz = new URL('../../static/v1/aplisboa/', import.meta.url);
	const temporadas = existsSync(raiz) ? readdirSync(raiz).sort().reverse() : [];
	const pasta = temporadas.length ? new URL(`${temporadas[0]}/match/`, raiz) : null;
	const fichas: FichaJogo[] =
		pasta && existsSync(pasta)
			? readdirSync(pasta)
					.filter((n) => n.endsWith('.json'))
					.map((n) => JSON.parse(readFileSync(new URL(n, pasta), 'utf8')))
			: [];
	const comBoletim = fichas.filter((f) => f.boletim?.parciais?.length);
	const deQuatro = comBoletim.filter((f) => partesNaCronologia(f.cronologia) === 4);

	it('há jogos de quatro partes com boletim, senão este teste não diz nada', () => {
		if (!fichas.length) return;
		expect(deQuatro.length).toBeGreaterThan(20);
	});

	it('cada jogo de quatro partes passa a mostrar quatro, e as contas batem com o boletim', () => {
		for (const f of deQuatro) {
			const b = boletimPorPartes(f.boletim!, f.cronologia, f.casa, f.fora);
			const partes = b.parciais.filter((p) => p.nome !== 'Resultado final');
			expect(partes.length, `jogo ${f.id}`).toBe(4);
			expect(b.partesPorMetade, `jogo ${f.id}`).toBe(2);
			// a soma das quatro é o resultado do jogo
			expect(partes.reduce((s, p) => s + (p.casa ?? 0), 0), `jogo ${f.id}`).toBe(f.golos_casa);
			expect(partes.reduce((s, p) => s + (p.fora ?? 0), 0), `jogo ${f.id}`).toBe(f.golos_fora);
		}
	});

	it('um jogo de duas partes fica exactamente como o boletim o publica', () => {
		for (const f of comBoletim.filter((f) => partesNaCronologia(f.cronologia) <= 2)) {
			const b = boletimPorPartes(f.boletim!, f.cronologia, f.casa, f.fora);
			expect(b.parciais, `jogo ${f.id}`).toEqual(f.boletim!.parciais);
			expect(b.partesPorMetade).toBe(1);
		}
	});
});

const golo = (parte: number, equipa: string): EventoJogo => ({
	ordem: 0,
	tipo: 'golo',
	relogio: null,
	parte,
	minuto: null,
	equipa,
	jogador: null,
	assistencia: null,
	variante: null,
	numero: null,
	golos_casa: null,
	golos_fora: null,
	texto: ''
});
const falta = (parte: number, equipa: string): EventoJogo => ({ ...golo(parte, equipa), tipo: 'falta_equipa' });

/** O jogo 9934 de 25/10/2026, Escolares, PAREDE FC A 4–4 A STUART HCM A — o da captura do treinador. */
const BOLETIM: Boletim = {
	oficiais: {},
	parciais: [
		{ nome: '1ª parte', casa: 3, fora: 3 },
		{ nome: '2ª parte', casa: 1, fora: 1 },
		{ nome: 'Resultado final', casa: 4, fora: 4 }
	],
	faltas_casa: [0, 2],
	faltas_fora: [1, 1],
	inicio: ['15:00', '15:27'],
	termo: ['15:22', '15:48'],
	capitao_casa: null,
	capitao_fora: null
};
const CASA = 'PAREDE FC A',
	FORA = 'A STUART HCM A';
const CRONOLOGIA = [
	golo(1, CASA), golo(1, CASA), golo(1, FORA), golo(1, CASA),
	golo(2, FORA), golo(2, FORA),
	golo(4, CASA), golo(4, FORA),
	falta(2, FORA), falta(3, CASA), falta(3, CASA), falta(3, FORA),
	{ ...golo(4, CASA), tipo: 'inicio_parte' as const, equipa: null }
];

describe('quando a cronologia tem quatro partes', () => {
	it('o 3–3 da primeira metade foi 3–1 e 0–2, e o boletim escondia isso', () => {
		const b = boletimPorPartes(BOLETIM, CRONOLOGIA, CASA, FORA);
		expect(b.parciais.map((p) => [p.nome, p.casa, p.fora])).toEqual([
			['1ª parte', 3, 1],
			['2ª parte', 0, 2],
			['3ª parte', 0, 0],
			['4ª parte', 1, 1],
			['Resultado final', 4, 4]
		]);
		expect(b.faltas_casa).toEqual([0, 0, 2, 0]);
		expect(b.faltas_fora).toEqual([0, 1, 1, 0]);
	});

	it('se os golos não baterem com o boletim, fica o boletim — é ele o documento oficial', () => {
		const b = boletimPorPartes(BOLETIM, [...CRONOLOGIA, golo(3, CASA)], CASA, FORA);
		expect(b.parciais).toEqual(BOLETIM.parciais);
		expect(b.partesPorMetade).toBe(1);
	});

	it('um golo de uma equipa que não é nenhuma das duas também deixa o boletim como está', () => {
		const b = boletimPorPartes(BOLETIM, [...CRONOLOGIA, golo(3, 'OUTRA')], CASA, FORA);
		expect(b.parciais).toEqual(BOLETIM.parciais);
	});

	it('se só as faltas não baterem, os golos vão em quatro e as faltas ficam em duas', () => {
		const b = boletimPorPartes(BOLETIM, [...CRONOLOGIA, falta(1, CASA)], CASA, FORA);
		expect(b.parciais).toHaveLength(5);
		expect(b.faltas_casa).toEqual(BOLETIM.faltas_casa);
	});

	it('as horas do boletim passam a dizer de que partes são', () => {
		expect(daMetade(0, 1)).toBe('da 1ª parte');
		expect(daMetade(1, 1)).toBe('da 2ª parte');
		expect(daMetade(0, 2)).toBe('das partes 1 e 2');
		expect(daMetade(1, 2)).toBe('das partes 3 e 4');
	});
});

describe('um jogo terminado sem boletim', () => {
	const raiz = new URL('../../static/v1/aplisboa/', import.meta.url);
	const temporadas = existsSync(raiz) ? readdirSync(raiz).sort().reverse() : [];
	const pasta = temporadas.length ? new URL(`${temporadas[0]}/match/`, raiz) : null;
	const semBoletim: FichaJogo[] =
		pasta && existsSync(pasta)
			? readdirSync(pasta)
					.filter((n) => n.endsWith('.json'))
					.map((n) => JSON.parse(readFileSync(new URL(n, pasta), 'utf8')) as FichaJogo)
					.filter((f) => !f.boletim?.parciais?.length && f.cronologia.some((e) => e.tipo === 'fim_jogo'))
			: [];

	it('mostra as partes de todos os que há, e elas somam o resultado — eram 12 a 26/10/2026', () => {
		// guarda contra o teste passar por não ter encontrado nada: os 12 de 26/10 não desaparecem
		if (pasta && existsSync(pasta)) expect(semBoletim.length).toBeGreaterThan(0);
		for (const f of semBoletim) {
			const b = boletimDaCronologia(f);
			expect(b, `jogo ${f.id}`).not.toBeNull();
			const partes = b!.parciais.filter((p) => p.nome !== 'Resultado final');
			expect(partes.length, `jogo ${f.id}`).toBe(partesNaCronologia(f.cronologia));
			expect(partes.reduce((s, p) => s + (p.casa ?? 0), 0)).toBe(f.golos_casa);
			expect(b!.daCronologia).toBe(true);
		}
	});

	const ficha = {
		cronologia: [...CRONOLOGIA, { ...golo(4, CASA), tipo: 'fim_jogo' as const, equipa: null }],
		casa: CASA,
		fora: FORA,
		golos_casa: 4,
		golos_fora: 4,
		faltas: [2, 2] as [number, number]
	};

	it('parte a parte, com as faltas quando somam as da ficha', () => {
		const b = boletimDaCronologia(ficha)!;
		expect(b.parciais.map((p) => [p.casa, p.fora])).toEqual([[3, 1], [0, 2], [0, 0], [1, 1], [4, 4]]);
		expect(b.faltas_casa).toEqual([0, 0, 2, 0]);
	});

	it('sem a marca de fim de jogo não mostra nada: um jogo a decorrer não tem "Final"', () => {
		expect(boletimDaCronologia({ ...ficha, cronologia: CRONOLOGIA })).toBeNull();
	});

	it('se os golos não somarem o resultado, não mostra nada', () => {
		expect(boletimDaCronologia({ ...ficha, golos_casa: 5 })).toBeNull();
	});

	it('se só as faltas não baterem, mostra os golos e cala as faltas', () => {
		const b = boletimDaCronologia({ ...ficha, faltas: [3, 2] })!;
		expect(b.parciais).toHaveLength(5);
		expect(b.faltas_casa).toEqual([]);
	});
});
