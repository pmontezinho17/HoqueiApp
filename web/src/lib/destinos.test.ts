import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { destinoDaEquipa, destinoDoJogo, saidasDaLinha } from './destinos';
import type { JogoAgenda } from './tipos';

/**
 * **De uma linha de jogo chega-se sempre a alguma coisa.**
 *
 * Foi o pedido mais repetido da caixa "O que está mal" — cinco das dezoito sugestões — e o
 * caso que lhe deu origem foi este: *"o click na equipa para irmos directos à equipa só dá nos
 * jogos com resultados, no que tem próximo jogo não dá"*. Um jogo por disputar sem ficha não
 * tinha saída nenhuma, e nenhum teste o podia dizer porque a decisão vivia dentro do `.svelte`.
 */

const jogo = (p: Partial<JogoAgenda> & { tem_ficha?: boolean } = {}) =>
	({ id: 9377, casa: 'CACO A', fora: 'SL BENFICA', gc: null, gf: null, cat: 'SUB-17', ...p }) as
		JogoAgenda & { tem_ficha?: boolean };

describe('a ficha do jogo', () => {
	it('abre quando já houve jogo', () => {
		expect(destinoDoJogo(jogo({ gc: 3, gf: 2 }))).toBe('/jogo/9377');
	});

	it('abre antes do jogo se a convocatória já estiver publicada', () => {
		expect(destinoDoJogo(jogo({ tem_ficha: true }))).toBe('/jogo/9377');
	});

	it('não abre um ecrã vazio: sem resultado e sem ficha não há destino', () => {
		expect(destinoDoJogo(jogo())).toBeNull();
	});

	it('nem sequer com ficha, se a fonte não deu id ao jogo', () => {
		expect(destinoDoJogo(jogo({ id: null, tem_ficha: true }))).toBeNull();
	});
});

describe('a página da equipa', () => {
	it('é sempre alcançável quando se sabe o escalão', () => {
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

describe('um alvo por linha', () => {
	it('com ficha, a linha abre o jogo e as equipas ficam fora do alcance do dedo', () => {
		expect(saidasDaLinha(jogo({ gc: 3, gf: 2 }))).toEqual({ jogo: '/jogo/9377', casa: null, fora: null });
	});

	it('sem ficha, a linha não abre nada e as duas equipas abrem-se', () => {
		expect(saidasDaLinha(jogo())).toEqual({
			jogo: null,
			casa: '/equipa/sub-17/caco-a',
			fora: '/equipa/sub-17/sl-benfica'
		});
	});

	it('sem ficha e sem escalão não há saída nenhuma, e isso é honesto', () => {
		expect(saidasDaLinha(jogo({ cat: '' }))).toEqual({ jogo: null, casa: null, fora: null });
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

	it('nenhuma linha fica sem saída nenhuma', () => {
		const presos = agenda.filter((j) => {
			const s = saidasDaLinha(j);
			return !s.jogo && !s.casa && !s.fora;
		});
		expect(presos.map((j) => `${j.data} ${j.casa} × ${j.fora} [${j.cat}]`)).toEqual([]);
	});

	it('nenhuma linha dá dois alvos ao mesmo dedo', () => {
		const ambos = agenda.filter((j) => {
			const s = saidasDaLinha(j);
			return !!s.jogo && (!!s.casa || !!s.fora);
		});
		expect(ambos.map((j) => `${j.data} ${j.casa} × ${j.fora}`)).toEqual([]);
	});

	it('quando a linha não abre o jogo, abre as duas equipas — era o pedido do utilizador', () => {
		const semFicha = agenda.filter((j) => destinoDoJogo(j) === null);
		expect(semFicha.length).toBeGreaterThan(0);
		const incompletos = semFicha.filter((j) => {
			const s = saidasDaLinha(j);
			return !s.casa || !s.fora;
		});
		expect(incompletos.map((j) => `${j.data} ${j.casa} × ${j.fora} [${j.cat}]`)).toEqual([]);
	});

	it('há mesmo jogos sem ficha na agenda, senão a regra não está a ser exercitada', () => {
		// Se um dia isto falhar é porque a agenda só tem jogos já disputados ou com ficha. Aí
		// confirma-se nos dados e empurra-se a verificação por escrito, em vez de a apagar.
		expect(agenda.some((j) => destinoDoJogo(j) === null)).toBe(true);
	});
});
