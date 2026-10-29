import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { barraDoMerito, contasDoJogo, descricaoDoMerito, linhasDoMerito } from './meritoDoJogo';
import type { FichaJogo } from './tipos';

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
	it('é uma percentagem do que a equipa ganhou: verde o que ficou, vermelho o que perdeu', () => {
		const b = barraDoMerito([9, -8]);
		expect(b.total).toBe(1);
		expect(b.ficou).toBeCloseTo(1 / 9);
		expect(b.perdeu).toBeCloseTo(8 / 9);
	});

	it('sem cinzento: as duas partes enchem sempre a barra toda', () => {
		for (const conta of [[6, 0], [14, 0], [9, -2], [6, -17], [11, -1]] as [number, number][]) {
			const b = barraDoMerito(conta);
			expect(b.ficou + b.perdeu, conta.join(' ')).toBeCloseTo(1);
		}
		expect(barraDoMerito([6, 0]).ficou).toBe(1);
	});

	it('abaixo de zero a barra fica toda vermelha — o Sporting CP no 10061, 6 − 17', () => {
		expect(barraDoMerito([6, -17])).toMatchObject({ total: -11, ficou: 0, perdeu: 1, abaixoDeZero: true });
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
			.toBe('Mérito: VIL 1 (ganhou 9, perdeu 8), TOJ 11, com uma penalização por confirmar');
	});
});
