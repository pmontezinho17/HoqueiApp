import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { destinoDaEquipa, destinoDoJogo } from './destinos';
import type { JogoAgenda } from './tipos';

/**
 * **De uma linha de jogo chega-se sempre à ficha do jogo — e só a ela.**
 *
 * Duas coisas foram apanhadas por utilizadores e vivem aqui agora:
 *
 * * *"o click na equipa para irmos directos à equipa só dá nos jogos com resultados, no que tem
 *   próximo jogo não dá"* — um jogo por disputar não tinha saída nenhuma;
 * * e, do dono, *"cada vez que quero abrir o jogo posso sem querer carregar em cima do nome
 *   clube e abrir o clube ao invés do jogo"* — a correcção ao excesso da primeira tentativa.
 *
 * A resposta às duas é a mesma regra: **um alvo por linha, e é o jogo**. Ver o `destinos.ts`.
 */

const jogo = (p: Partial<JogoAgenda> = {}) =>
	({ id: 9377, casa: 'CACO A', fora: 'SL BENFICA', gc: null, gf: null, cat: 'SUB-17', ...p }) as JogoAgenda;

describe('a ficha do jogo', () => {
	it('abre quando já houve jogo', () => {
		expect(destinoDoJogo(jogo({ gc: 3, gf: 2 }))).toBe('/jogo/9377');
	});

	it('abre também num jogo por disputar: desde 09/10 a página monta-se a partir da agenda', () => {
		expect(destinoDoJogo(jogo())).toBe('/jogo/9377');
	});

	it('não abre quando a fonte não deu id ao jogo — aí não há para onde ir', () => {
		expect(destinoDoJogo(jogo({ id: null }))).toBeNull();
	});
});

describe('a página da equipa', () => {
	it('é alcançável quando se sabe o escalão', () => {
		expect(destinoDaEquipa('CACO A', 'SUB-17')).toBe('/equipa/sub-17/caco-a');
	});

	it('o escalão faz parte da identidade: o mesmo clube em dois escalões são duas equipas', () => {
		expect(destinoDaEquipa('CACO A', 'SUB-13')).not.toBe(destinoDaEquipa('CACO A', 'SUB-17'));
	});

	it('sem escalão não se inventa um endereço — um 404 é pior do que não ter link', () => {
		expect(destinoDaEquipa('CACO A', null)).toBeNull();
		expect(destinoDaEquipa('CACO A', '')).toBeNull();
		expect(destinoDaEquipa('', 'SUB-17')).toBeNull();
	});
});

describe('contra a agenda publicada', () => {
	const raiz = new URL('../../static/v1/aplisboa/', import.meta.url);
	const temporadas = existsSync(raiz) ? readdirSync(raiz).sort().reverse() : [];
	const base = temporadas.length ? new URL(`${temporadas[0]}/`, raiz) : null;
	const agenda: JogoAgenda[] = (() => {
		if (!base) return [];
		const f = new URL('agenda.json', base);
		if (!existsSync(f)) return [];
		return JSON.parse(readFileSync(f, 'utf-8'))?.jogos ?? [];
	})();

	it('a agenda publicada tem jogos, senão não se está a verificar nada', () => {
		expect(agenda.length).toBeGreaterThan(0);
	});

	it('nenhuma linha fica sem saída', () => {
		const presos = agenda.filter((j) => destinoDoJogo(j) === null);
		expect(presos.map((j) => `${j.data} ${j.casa} × ${j.fora} [${j.cat}]`)).toEqual([]);
	});

	it('há mesmo jogos por disputar na agenda — é o caso que estava sem saída', () => {
		// Se um dia isto falhar é porque a agenda só tem jogos já disputados. Aí confirma-se nos
		// dados e empurra-se a verificação por escrito, em vez de a apagar.
		const porDisputar = agenda.filter((j) => j.gc === null && j.gf === null);
		expect(porDisputar.length).toBeGreaterThan(0);
		expect(porDisputar.every((j) => destinoDoJogo(j) !== null)).toBe(true);
	});

	it('as equipas da agenda são todas alcançáveis a partir da ficha do jogo', () => {
		// Não é a linha que lá leva — é o emblema, já dentro da ficha. Mas o endereço tem de
		// existir, senão o emblema fica sem destino.
		const sem = agenda.filter(
			(j) => !destinoDaEquipa(j.casa, j.cat) || !destinoDaEquipa(j.fora, j.cat)
		);
		expect(sem.map((j) => `${j.data} ${j.casa} × ${j.fora} [${j.cat}]`)).toEqual([]);
	});
});
