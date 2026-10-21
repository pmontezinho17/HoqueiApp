import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { agruparPorHora, agruparPorLocal } from './agrupar';
import type { JogoAgenda } from './tipos';

/**
 * **Agrupar os jogos do dia por hora e por recinto.**
 *
 * Sugestão de um utilizador a 17/10/2026, item `S12` do backlog. O porquê das escolhas de
 * ordenação está no `agrupar.ts`.
 */

const jogo = (p: Partial<JogoAgenda>): JogoAgenda =>
	({ id: 1, casa: 'A', fora: 'B', gc: null, gf: null, cat: 'SUB-13', data: '2026-10-24', ...p }) as JogoAgenda;

describe('por hora', () => {
	it('os blocos sobem com o relógio', () => {
		const b = agruparPorHora([
			jogo({ id: 1, hora: '17:30:00' }),
			jogo({ id: 2, hora: '09:00:00' }),
			jogo({ id: 3, hora: '14:45:00' })
		]);
		expect(b.map((x) => x.titulo)).toEqual(['09:00', '14:45', '17:30']);
	});

	it('os segundos não aparecem: a fonte dá "15:00:00" e lê-se "15:00"', () => {
		expect(agruparPorHora([jogo({ hora: '15:00:00' })])[0].titulo).toBe('15:00');
	});

	it('jogos à mesma hora ficam no mesmo bloco, pela ordem em que vieram', () => {
		const b = agruparPorHora([
			jogo({ id: 1, hora: '10:00:00', cat: 'BENJAMINS' }),
			jogo({ id: 2, hora: '10:00:00', cat: 'SUB-13' })
		]);
		expect(b).toHaveLength(1);
		expect(b[0].jogos.map((j) => j.id)).toEqual([1, 2]);
	});

	it('sem hora publicada vai para o fim, e não para o topo', () => {
		// Pô-lo no topo seria dar-lhe a hora mais cedo do dia — uma hora inventada.
		const b = agruparPorHora([jogo({ id: 1, hora: null }), jogo({ id: 2, hora: '11:00:00' })]);
		expect(b.map((x) => x.titulo)).toEqual(['11:00', 'Sem hora marcada']);
	});
});

describe('por recinto', () => {
	it('dentro de cada recinto, os jogos vão por hora — foi o que a pessoa pediu', () => {
		const b = agruparPorLocal([
			jogo({ id: 1, recinto: 'PAV. PAREDE', hora: '18:00:00' }),
			jogo({ id: 2, recinto: 'PAV. PAREDE', hora: '11:00:00' })
		]);
		expect(b[0].jogos.map((j) => j.id)).toEqual([2, 1]);
	});

	it('os recintos ordenam-se pelo primeiro jogo de cada um, não por nome', () => {
		// Quem abre isto a meio da tarde quer ver o que vem a seguir; por ordem alfabética
		// teria de ler tudo para o descobrir.
		const b = agruparPorLocal([
			jogo({ id: 1, recinto: 'ZZ PAVILHÃO', hora: '09:00:00' }),
			jogo({ id: 2, recinto: 'AA PAVILHÃO', hora: '20:00:00' })
		]);
		expect(b.map((x) => x.titulo)).toEqual(['ZZ PAVILHÃO', 'AA PAVILHÃO']);
	});

	it('à mesma hora, desempata o nome', () => {
		const b = agruparPorLocal([
			jogo({ id: 1, recinto: 'PAV. SINTRA', hora: '15:00:00' }),
			jogo({ id: 2, recinto: 'PAV. OEIRAS', hora: '15:00:00' })
		]);
		expect(b.map((x) => x.titulo)).toEqual(['PAV. OEIRAS', 'PAV. SINTRA']);
	});

	it('sem recinto vai para o fim', () => {
		const b = agruparPorLocal([
			jogo({ id: 1, recinto: null, hora: '08:00:00' }),
			jogo({ id: 2, recinto: 'PAV. MAFRA', hora: '21:00:00' })
		]);
		expect(b.map((x) => x.titulo)).toEqual(['PAV. MAFRA', 'Sem recinto indicado']);
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

	it('nenhum jogo se perde nem se duplica, em qualquer dos dois agrupamentos', () => {
		for (const blocos of [agruparPorHora(diaCheio), agruparPorLocal(diaCheio)]) {
			const ids = blocos.flatMap((b) => b.jogos.map((j) => j.id));
			expect(ids).toHaveLength(diaCheio.length);
			expect(new Set(ids).size).toBe(new Set(diaCheio.map((j) => j.id)).size);
		}
	});

	it('as chaves dos blocos são únicas — senão o `{#each}` baralha-se', () => {
		for (const blocos of [agruparPorHora(diaCheio), agruparPorLocal(diaCheio)]) {
			const chaves = blocos.map((b) => b.chave);
			expect(new Set(chaves).size).toBe(chaves.length);
		}
	});
});
