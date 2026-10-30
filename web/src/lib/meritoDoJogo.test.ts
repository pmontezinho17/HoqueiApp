import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
	barraDoMerito, contasDoJogo, descricaoDoMerito, fichaPorEsclarecer, linhasDoMerito
} from './meritoDoJogo';
import type { FichaJogo, MeritoDaEquipa } from './tipos';

/**
 * A tabela do separador do Mérito, contra **todos** os jogos publicados — ver `meritoDoJogo.ts`.
 * A pergunta é se a conta que o ecrã mostra bate com o total que a ficha publica, jogo a jogo.
 */
const PASTA = 'static/v1/aplisboa/2026-27/match';
const comMerito: FichaJogo[] = existsSync(PASTA)
	? readdirSync(PASTA)
			.filter((n) => n.endsWith('.json'))
			.map((n) => JSON.parse(readFileSync(`${PASTA}/${n}`, 'utf8')) as FichaJogo)
			.filter((f) => f.merito?.length)
	: [];
const ficha = (id: number) => comMerito.find((f) => f.id === id);

describe('o Mérito de cada jogo publicado', () => {
	it.skipIf(!comMerito.length)('há jogos com Mérito, senão isto não diz nada — eram 79 a 27/10/2026', () => {
		expect(comMerito.length).toBeGreaterThan(50);
	});

	it.skipIf(!comMerito.length)('as duas contas encontram-se em todos', () => {
		for (const f of comMerito) expect(contasDoJogo(f.merito, f.casa, f.fora), `jogo ${f.id}`).not.toBeNull();
	});

	it.skipIf(!comMerito.length)('as linhas somam o total publicado, de cada equipa', () => {
		for (const f of comMerito) {
			const { casa, fora } = contasDoJogo(f.merito, f.casa, f.fora)!;
			const linhas = linhasDoMerito(casa, fora);
			expect(linhas.reduce((s, l) => s + (l.casa ?? 0), 0), `jogo ${f.id}`).toBe(casa.total);
			expect(linhas.reduce((s, l) => s + (l.fora ?? 0), 0), `jogo ${f.id}`).toBe(fora.total);
		}
	});

	it.skipIf(!comMerito.length)('nenhuma regra publicada fica sem nome — e o "1 fizeram" não aparece', () => {
		for (const f of comMerito) {
			const { casa, fora } = contasDoJogo(f.merito, f.casa, f.fora)!;
			for (const l of linhasDoMerito(casa, fora)) {
				expect(l.rotulo, `jogo ${f.id}`).not.toMatch(/^\d/);
				expect(l.rotulo).not.toMatch(/fizeram/);
			}
		}
	});

	it.skipIf(!comMerito.length)('nenhuma linha vazia: só as regras que deram pontos', () => {
		for (const f of comMerito) {
			const { casa, fora } = contasDoJogo(f.merito, f.casa, f.fora)!;
			for (const l of linhasDoMerito(casa, fora)) expect(l.casa !== null || l.fora !== null).toBe(true);
		}
	});

	it.skipIf(!ficha(10071))('o 10071: ganhou 21–5 e o Mérito foi 1–11', () => {
		const f = ficha(10071)!;
		const { casa, fora } = contasDoJogo(f.merito, f.casa, f.fora)!;
		expect([casa.total, fora.total]).toEqual([1, 11]);
		expect(linhasDoMerito(casa, fora).map((l) => [l.grupo, l.rotulo, l.casa, l.fora])).toEqual([
			['ganha', 'Atletas em jogo', 6, 10],
			['ganha', 'Marcou mais golos', 3, null],
			['ganha', 'Equipa completa', null, 1],
			['perde', 'Menos de 8 atletas', -1, null],
			['perde', 'Só um guarda-redes', -1, null],
			['perde', 'Três meias partes seguidas', -2, null],
			['perde', 'As quatro meias partes', -4, null]
		]);
	});
});

describe('uma regra que o catálogo não conhece', () => {
	it('aparece com o texto do raspador, e a conta continua a bater', () => {
		const base = { equipa: 'A', atletas: 10, guardas_redes: 2, participantes: 10, completa: true, avisos: [] };
		const a = { ...base, bonificacao: 10, penalizacao: -5, total: 5, parcelas: [
			{ regra: '3.1', texto: '10 atletas participantes', pontos: 10 },
			{ regra: '4.9', texto: 'uma regra nova', pontos: -5 }] };
		const b = { ...base, equipa: 'B', bonificacao: 10, penalizacao: 0, total: 10, parcelas: [
			{ regra: '3.1', texto: '10 atletas participantes', pontos: 10 }] };
		const linhas = linhasDoMerito(a, b);
		expect(linhas.at(-1)).toMatchObject({ grupo: 'perde', rotulo: 'uma regra nova', casa: -5, fora: null });
	});
});

describe('a barra de cada equipa', () => {
	it('é a proporção dos pontos positivos e negativos — a FSE/AJ Salesiana A, 8 e −1', () => {
		const b = barraDoMerito([8, -1]);
		expect(b.total).toBe(7);
		expect(b.ficou).toBeCloseTo(8 / 9);
		expect(b.perdeu).toBeCloseTo(1 / 9);
	});

	it('com mais negativos do que positivos, quase meio a meio — o S Alenquer Benfica, 9 e −10', () => {
		const b = barraDoMerito([9, -10]);
		expect(b.total).toBe(-1);
		expect(b.ficou).toBeCloseTo(9 / 19);
		expect(b.perdeu).toBeCloseTo(10 / 19);
	});

	it('sem cinzento: as duas partes enchem sempre a barra toda', () => {
		for (const conta of [[6, 0], [14, 0], [9, -2], [6, -17], [11, -1]] as [number, number][]) {
			const b = barraDoMerito(conta);
			expect(b.ficou + b.perdeu, conta.join(' ')).toBeCloseTo(1);
		}
		expect(barraDoMerito([6, 0]).ficou).toBe(1);
	});

	it('abaixo de zero continua a haver verde — o Sporting CP no 10061, 6 e −17', () => {
		const b = barraDoMerito([6, -17]);
		expect(b).toMatchObject({ total: -11, abaixoDeZero: true });
		expect(b.ficou).toBeCloseTo(6 / 23);
	});

	it('só fica toda vermelha quando não houve ponto positivo nenhum', () => {
		expect(barraDoMerito([0, -10])).toMatchObject({ ficou: 0, perdeu: 1 });
	});

	it('e nos jogos publicados também enche sempre', () => {
		for (const f of comMerito) {
			const { casa, fora } = contasDoJogo(f.merito, f.casa, f.fora)!;
			for (const m of [casa, fora]) {
				const b = barraDoMerito([m.bonificacao, m.penalizacao]);
				expect(b.ficou + b.perdeu, `jogo ${f.id}`).toBeCloseTo(1);
			}
		}
	});

	it('quem lê por voz ouve a conta, e o por confirmar', () => {
		expect(descricaoDoMerito({ casa: [9, -8], fora: [11, 0], por_confirmar: true }, 'VIL', 'TOJ'))
			.toBe('Mérito: VIL 1 (ganhou 9, perdeu 8), TOJ 11, com pontos por confirmar');
	});
});

describe('a ficha com letras que não são o X', () => {
	const equipa = (extra: Partial<MeritoDaEquipa> = {}): MeritoDaEquipa => ({
		equipa: 'A', atletas: 8, guardas_redes: 2, participantes: 8, completa: false,
		bonificacao: 8, penalizacao: 0, total: 8, parcelas: [], avisos: [], ...extra
	});

	it('uma só equipa com um J chega para o jogo inteiro ficar por esclarecer', () => {
		expect(fichaPorEsclarecer(equipa({ marcas_fora_do_x: { J: 1 } }), equipa())).toBe(true);
		expect(fichaPorEsclarecer(equipa(), equipa({ marcas_fora_do_x: { J: 7 } }))).toBe(true);
	});

	it('um aviso do 4.1.7 não é isto, e uma ficha de antes de 29/10 também não', () => {
		expect(fichaPorEsclarecer(equipa({ avisos: ['1 atleta(s) com um só período'] }), equipa())).toBe(false);
		expect(fichaPorEsclarecer(equipa({ marcas_fora_do_x: {} }), equipa())).toBe(false);
	});

	// os quatro jogos com J ainda não foram relidos com o campo novo; quando forem, este número
	// passa de 0 a 4, e um jogo com a nota em que nenhuma das equipas tem a letra seria um defeito
	it.skipIf(!comMerito.length)('nos jogos publicados, a nota só aparece onde há a letra', () => {
		for (const f of comMerito) {
			const [casa, fora] = f.merito!;
			const letras = f.merito!.some((m) => Object.keys(m.marcas_fora_do_x ?? {}).length);
			expect(fichaPorEsclarecer(casa, fora)).toBe(letras);
		}
	});
});
