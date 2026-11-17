import { existsSync, readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { juntarFontes } from './fontes';
import {
	caminhoJogo,
	daCompeticao,
	doJogo,
	esquecer,
	idNaRota,
	lerIdDaRota,
	registar
} from './inquilinos';
import type { Competicao, JogoAgenda } from './tipos';

afterEach(esquecer);

describe('os endereços dos jogos', () => {
	it('a APL fica sem prefixo e a FPP ganha o nome à frente', () => {
		registar('fpp', { competicoes: [348], jogos: [18262] });
		expect(caminhoJogo(9644)).toBe('/jogo/9644');
		expect(caminhoJogo(18262)).toBe('/jogo/fpp-18262');
		expect(idNaRota(18262, 'aplisboa')).toBe('18262');
	});

	it('lê o que escreve, e um link antigo continua a ser da APL', () => {
		expect(lerIdDaRota('fpp-18262')).toEqual({ inq: 'fpp', id: 18262 });
		expect(lerIdDaRota('9644')).toEqual({ inq: 'aplisboa', id: 9644 });
		for (const lixo of ['', 'fpp-', 'abc', '12a', 'apl-9644', '-1', '9644/x'])
			expect(lerIdDaRota(lixo), lixo).toBeNull();
	});

	it('um número que ninguém registou é da APL, como sempre foi', () => {
		expect(daCompeticao(431)).toBe('aplisboa');
		expect(doJogo(9644)).toBe('aplisboa');
	});
});

describe('juntar as fontes', () => {
	const apl = {
		competicoes: [{ id: 432, nome: 'TAÇA', categoria: 'SENIORES MASCULINOS' }] as Competicao[],
		agenda: [{ id: 9432, comp: 432, casa: 'PAREDE FC', fora: 'AD OEIRAS' }] as JogoAgenda[],
		equipas: [{ equipa: 'PAREDE FC', categoria: 'SENIORES MASCULINOS', competicoes: [432] }],
		emblemas: { 'PAREDE FC': '/emblemas/11.webp', 'AD OEIRAS': '/emblemas/6.webp' }
	};
	const fpp = {
		competicoes: [{ id: 350, nome: '2ª SUL', categoria: 'CAMPEONATO NACIONAL 2ª DIVISAO' }] as Competicao[],
		agenda: [{ id: 18500, comp: 350, casa: 'PAREDE FC', fora: 'HC TURQUEL' }] as JogoAgenda[],
		equipas: [{ equipa: 'PAREDE FC', categoria: 'CAMPEONATO NACIONAL 2ª DIVISAO', competicoes: [350] }],
		emblemas: { 'PAREDE FC': '/emblemas/fpp-40.webp', 'HC TURQUEL': '/emblemas/fpp-41.webp' }
	};

	it('sem a FPP publicada, a app é a de sempre', () => {
		expect(juntarFontes(apl, null)).toBe(apl);
		expect(daCompeticao(432)).toBe('aplisboa');
	});

	it('marca só as linhas da FPP, e regista os números dela', () => {
		const j = juntarFontes(apl, fpp);
		expect(j.agenda.map((x) => x.inq)).toEqual([undefined, 'fpp']);
		expect(j.competicoes.map((x) => x.inq)).toEqual([undefined, 'fpp']);
		expect(j.equipas.map((x) => x.inq)).toEqual([undefined, 'fpp']);
		expect(daCompeticao(350)).toBe('fpp');
		expect(doJogo(18500)).toBe('fpp');
		expect(doJogo(9432)).toBe('aplisboa');
	});

	it('o emblema da APL ganha quando o nome existe nas duas', () => {
		const { emblemas } = juntarFontes(apl, fpp);
		expect(emblemas['PAREDE FC']).toBe('/emblemas/11.webp');
		expect(emblemas['HC TURQUEL']).toBe('/emblemas/fpp-41.webp');
	});
});

/**
 * **O preço de manter os números da fonte**: não se podem repetir entre a APL e a FPP, porque o
 * registo de `inquilinos.ts` diz de quem é cada um pelo número. Corre contra os dados publicados
 * das duas, e salta enquanto a FPP não estiver na árvore — no `dev` ela não está commitada, e
 * no `main` está a partir da primeira ronda de produção com as ligas nacionais.
 */
describe('os números das duas fontes não se cruzam', () => {
	const ler = (fonte: string, nome: string) => {
		const u = new URL(`../../static/v1/${fonte}/2026-27/${nome}`, import.meta.url);
		return existsSync(u) ? JSON.parse(readFileSync(u, 'utf-8')) : null;
	};
	const temAs2 = !!ler('fpp', 'agenda.json') && !!ler('aplisboa', 'agenda.json');

	it.skipIf(!temAs2)('nas competições', () => {
		const a = new Set(ler('aplisboa', 'competitions.json').competicoes.map((c: Competicao) => c.id));
		const f = ler('fpp', 'competitions.json').competicoes.map((c: Competicao) => c.id);
		expect(f.length).toBeGreaterThan(0);
		expect(f.filter((id: number) => a.has(id))).toEqual([]);
	});

	it.skipIf(!temAs2)('nos jogos', () => {
		const a = new Set(ler('aplisboa', 'agenda.json').jogos.map((j: JogoAgenda) => j.id).filter(Boolean));
		const f = ler('fpp', 'agenda.json').jogos.map((j: JogoAgenda) => j.id).filter(Boolean);
		expect(f.length).toBeGreaterThan(100);
		expect(f.filter((id: number) => a.has(id))).toEqual([]);
	});
});
