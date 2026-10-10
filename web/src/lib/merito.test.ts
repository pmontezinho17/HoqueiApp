/**
 * O contrato dos ficheiros `/v1/.../merito/<id>.json`, contra os ficheiros publicados a sério.
 *
 * É o mesmo padrão do `test_tabela.py` do lado do raspador: em vez de inventar um objecto e
 * verificar que o código o lê, lê o que está publicado e exige que bata certo com o tipo que
 * a app espera. Um campo renomeado no Python passava os testes do Python e dava uma tabela
 * vazia no telemóvel — este é o teste que fica entre as duas linguagens.
 *
 * E guarda a regra que mais importa: **nenhum nome de criança nestes ficheiros.** A grelha do
 * boletim diz que meia parte cada uma jogou, e o que sai para o site é só a soma da equipa.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import type { FicheiroMerito } from './tipos';

const PASTA = 'static/v1/aplisboa/2026-27/merito';

const ficheiros = existsSync(PASTA)
	? readdirSync(PASTA)
			.filter((f) => f.endsWith('.json'))
			.map((f) => [f, JSON.parse(readFileSync(`${PASTA}/${f}`, 'utf-8')) as FicheiroMerito] as const)
	: [];

describe('ficheiros de mérito publicados', () => {
	it.skipIf(ficheiros.length === 0)('há oito, um por Encontro Distrital', () => {
		expect(ficheiros.length).toBe(8);
	});

	it.skipIf(ficheiros.length === 0)('só os Encontros Distritais têm mérito', () => {
		for (const [, d] of ficheiros) expect(d.nome).toMatch(/^ENCONTROS DISTRITAIS/);
	});

	it.skipIf(ficheiros.length === 0)('todos os campos que a app lê estão lá', () => {
		for (const [nome, d] of ficheiros) {
			expect(typeof d.competicao_id, nome).toBe('number');
			expect(typeof d.jogos_lidos, nome).toBe('number');
			expect(typeof d.jogos_sem_boletim, nome).toBe('number');
			for (const l of d.linhas) {
				for (const campo of ['posicao', 'jogos', 'participantes', 'bonificacao',
					'penalizacao', 'pontos', 'media', 'por_confirmar'] as const) {
					expect(typeof l[campo], `${nome} ${l.equipa}.${campo}`).toBe('number');
				}
				expect(typeof l.equipa, nome).toBe('string');
			}
		}
	});

	it.skipIf(ficheiros.length === 0)('a conta fecha: bonificação + penalização = pontos', () => {
		for (const [nome, d] of ficheiros)
			for (const l of d.linhas)
				expect(l.bonificacao + l.penalizacao, `${nome} ${l.equipa}`).toBe(l.pontos);
	});

	it.skipIf(ficheiros.length === 0)('a penalização nunca é positiva', () => {
		for (const [nome, d] of ficheiros)
			for (const l of d.linhas) expect(l.penalizacao, `${nome} ${l.equipa}`).toBeLessThanOrEqual(0);
	});

	it.skipIf(ficheiros.length === 0)('as posições são 1..n, sem buracos nem repetições', () => {
		for (const [nome, d] of ficheiros)
			expect(d.linhas.map((l) => l.posicao), nome).toEqual(d.linhas.map((_, i) => i + 1));
	});

	it.skipIf(ficheiros.length === 0)('está ordenado por pontos, de cima para baixo', () => {
		for (const [nome, d] of ficheiros)
			for (let i = 1; i < d.linhas.length; i++)
				expect(d.linhas[i - 1].pontos, `${nome} linha ${i}`).toBeGreaterThanOrEqual(
					d.linhas[i].pontos
				);
	});

	it.skipIf(ficheiros.length === 0)('a média é os pontos a dividir pelos jogos', () => {
		for (const [nome, d] of ficheiros)
			for (const l of d.linhas)
				expect(l.media, `${nome} ${l.equipa}`).toBeCloseTo(l.pontos / l.jogos, 2);
	});

	it.skipIf(ficheiros.length === 0)('nenhum nome de atleta escapou para o ficheiro', () => {
		// os nomes de equipa são maiúsculas e podem ter duas palavras ("AD OEIRAS"), por isso
		// não serve procurar maiúsculas: procura-se a forma da grelha que não pode cá estar
		for (const [nome, d] of ficheiros) {
			const bruto = JSON.stringify(d);
			for (const proibido of ['periodos', 'atletas_detalhe', 'numero', 'licenca', 'nome_atleta'])
				expect(bruto.includes(`"${proibido}"`), `${nome} tem ${proibido}`).toBe(false);
		}
	});
});

describe('as fichas de jogo guardam o mérito agregado e mais nada', () => {
	const MATCH = 'static/v1/aplisboa/2026-27/match';
	const comMerito = existsSync(MATCH)
		? readdirSync(MATCH)
				.map((f) => JSON.parse(readFileSync(`${MATCH}/${f}`, 'utf-8')))
				.filter((d) => d.merito)
		: [];

	it.skipIf(comMerito.length === 0)('são só jogos de Escolares e Benjamins', () => {
		for (const d of comMerito) expect(['ESCOLARES', 'BENJAMINS']).toContain(d.categoria);
	});

	it.skipIf(comMerito.length === 0)('duas equipas por jogo, e nenhuma grelha por atleta', () => {
		for (const d of comMerito) {
			expect(d.merito.length, `jogo ${d.id}`).toBe(2);
			expect(JSON.stringify(d.merito)).not.toContain('"periodos"');
			for (const m of d.merito)
				expect(m.bonificacao + m.penalizacao, `jogo ${d.id} ${m.equipa}`).toBe(m.total);
		}
	});
});
