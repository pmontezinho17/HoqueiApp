import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { agruparPorLocal, ordenarPorHora } from './agrupar';
import type { JogoAgenda } from './tipos';

/**
 * **Ordenar por hora e agrupar por recinto, nos jogos do dia.**
 *
 * Sugestão de um utilizador a 17/10/2026, item `S12` do backlog, afinada pelo dono a 21/10 — a
 * vista por hora deixou de ter uma caixa por hora e os recintos passaram a alfabéticos. O porquê
 * das duas coisas está no `agrupar.ts`.
 */

const jogo = (p: Partial<JogoAgenda>): JogoAgenda =>
	({ id: 1, casa: 'A', fora: 'B', gc: null, gf: null, cat: 'SUB-13', data: '2026-10-24', ...p }) as JogoAgenda;

describe('por hora', () => {
	it('é uma lista só, por ordem de relógio — não uma caixa por hora', () => {
		// "a caixa das 10h tem um jogo que começa às 10h, depois a caixa das 11h tens um jogo que
		// começa às 11" — medido: em 24 dos 56 dias com jogos cada caixa teria um jogo lá dentro.
		const l = ordenarPorHora([
			jogo({ id: 1, hora: '17:30:00' }),
			jogo({ id: 2, hora: '09:00:00' }),
			jogo({ id: 3, hora: '14:45:00' })
		]);
		expect(l.map((j) => j.id)).toEqual([2, 3, 1]);
	});

	it('jogos à mesma hora mantêm a ordem em que vieram', () => {
		const l = ordenarPorHora([
			jogo({ id: 1, hora: '10:00:00', cat: 'BENJAMINS' }),
			jogo({ id: 2, hora: '10:00:00', cat: 'SUB-13' })
		]);
		expect(l.map((j) => j.id)).toEqual([1, 2]);
	});

	it('sem hora publicada vai para o fim, e não para o topo', () => {
		// Pô-lo no topo seria dar-lhe a hora mais cedo do dia — uma hora inventada.
		const l = ordenarPorHora([jogo({ id: 1, hora: null }), jogo({ id: 2, hora: '11:00:00' })]);
		expect(l.map((j) => j.id)).toEqual([2, 1]);
	});

	it('não mexe na lista que recebe', () => {
		const entrada = [jogo({ id: 1, hora: '20:00:00' }), jogo({ id: 2, hora: '08:00:00' })];
		ordenarPorHora(entrada);
		expect(entrada.map((j) => j.id)).toEqual([1, 2]);
	});
});

describe('por recinto', () => {
	it('os recintos vêm por ordem alfabética', () => {
		// A primeira versão ordenava-os pelo primeiro jogo de cada um. O dono corrigiu-a no mesmo
		// dia: numa lista de pavilhões o que se faz é procurar um.
		const b = agruparPorLocal([
			jogo({ id: 1, recinto: 'ZZ PAVILHÃO', hora: '09:00:00' }),
			jogo({ id: 2, recinto: 'AA PAVILHÃO', hora: '20:00:00' })
		]);
		expect(b.map((x) => x.titulo)).toEqual(['AA PAVILHÃO', 'ZZ PAVILHÃO']);
	});

	it('e os acentos não os atiram para o fim', () => {
		const b = agruparPorLocal([
			jogo({ id: 1, recinto: 'PAV. ZÉ' }),
			jogo({ id: 2, recinto: 'PAV. ÁGUEDA' }),
			jogo({ id: 3, recinto: 'PAV. BEJA' })
		]);
		expect(b.map((x) => x.titulo)).toEqual(['PAV. ÁGUEDA', 'PAV. BEJA', 'PAV. ZÉ']);
	});

	it('dentro de cada recinto, os jogos vão por hora — foi o que a pessoa pediu', () => {
		const b = agruparPorLocal([
			jogo({ id: 1, recinto: 'PAV. PAREDE', hora: '18:00:00' }),
			jogo({ id: 2, recinto: 'PAV. PAREDE', hora: '11:00:00' })
		]);
		expect(b[0].jogos.map((j) => j.id)).toEqual([2, 1]);
	});

	it('e um jogo sem hora fica no fim do seu recinto', () => {
		const b = agruparPorLocal([
			jogo({ id: 1, recinto: 'PAV. PAREDE', hora: null }),
			jogo({ id: 2, recinto: 'PAV. PAREDE', hora: '11:00:00' })
		]);
		expect(b[0].jogos.map((j) => j.id)).toEqual([2, 1]);
	});

	it('sem recinto vai para o fim de tudo', () => {
		const b = agruparPorLocal([
			jogo({ id: 1, recinto: null, hora: '08:00:00' }),
			jogo({ id: 2, recinto: 'ZZZ PAVILHÃO', hora: '21:00:00' })
		]);
		expect(b.map((x) => x.titulo)).toEqual(['ZZZ PAVILHÃO', 'Sem recinto indicado']);
	});
});

describe('contra a agenda publicada', () => {
	const raiz = new URL('../../static/v1/aplisboa/', import.meta.url);
	const temporadas = existsSync(raiz) ? readdirSync(raiz).sort().reverse() : [];
	const base = temporadas.length ? new URL(`${temporadas[0]}/`, raiz) : null;
	const agenda: JogoAgenda[] = (() => {
		if (!base) return [];
		const f = new URL('agenda.json', base);
		return existsSync(f) ? (JSON.parse(readFileSync(f, 'utf-8'))?.jogos ?? []) : [];
	})();

	/** o dia com mais jogos da época — é ali que um agrupamento mau se nota */
	const diaCheio = (() => {
		const m = new Map<string, JogoAgenda[]>();
		for (const j of agenda) (m.get(j.data) ?? m.set(j.data, []).get(j.data)!).push(j);
		return [...m.values()].sort((a, b) => b.length - a.length)[0] ?? [];
	})();

	it('a agenda tem um dia com jogos que cheguem para isto valer', () => {
		expect(diaCheio.length).toBeGreaterThan(5);
	});

	it('nenhum jogo se perde nem se duplica, em nenhuma das duas vistas', () => {
		const porHora = ordenarPorHora(diaCheio).map((j) => j.id);
		expect(porHora).toHaveLength(diaCheio.length);

		const porLocal = agruparPorLocal(diaCheio).flatMap((b) => b.jogos.map((j) => j.id));
		expect(porLocal).toHaveLength(diaCheio.length);
		expect(new Set(porLocal).size).toBe(new Set(diaCheio.map((j) => j.id)).size);
	});

	it('as chaves dos recintos são únicas — senão o `{#each}` baralha-se', () => {
		const chaves = agruparPorLocal(diaCheio).map((b) => b.chave);
		expect(new Set(chaves).size).toBe(chaves.length);
	});

	it('e os recintos saem mesmo por ordem alfabética nos dados verdadeiros', () => {
		const titulos = agruparPorLocal(diaCheio)
			.map((b) => b.titulo)
			.filter((t) => t !== 'Sem recinto indicado');
		expect(titulos).toEqual([...titulos].sort((a, b) => a.localeCompare(b, 'pt')));
	});
});
