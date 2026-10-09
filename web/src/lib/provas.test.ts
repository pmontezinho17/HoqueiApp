import { describe, expect, it } from 'vitest';
import { agruparProvas, enderecoDoMenu, filtrarProvas, provaActual } from './provas';
import type { Competicao, Jogo } from './tipos';

/** Só interessam a data e o resultado; `disputado()` olha para os golos. */
const jogo = (data: string, gc: number | null = null): Jogo =>
	({ id: 1, jornada: '1', data, hora: '18:00', casa: 'A', fora: 'B',
		golos_casa: gc, golos_fora: gc === null ? null : 0, recinto: null }) as unknown as Jogo;

const HOJE = '2026-10-02';

describe('provaActual', () => {
	it('prefere a prova a meio ao campeonato que ainda não começou', () => {
		expect(provaActual([
			{ id: 10, jogos: [jogo('2026-11-02'), jogo('2026-11-09')] },             // por começar
			{ id: 20, jogos: [jogo('2026-09-20', 3), jogo('2026-10-10')] }           // a meio
		], HOJE)).toBe(20);
	});

	it('entre duas a meio, escolhe a do jogo mais próximo', () => {
		expect(provaActual([
			{ id: 10, jogos: [jogo('2026-09-01', 2), jogo('2026-12-01')] },
			{ id: 20, jogos: [jogo('2026-09-01', 2), jogo('2026-10-04')] }
		], HOJE)).toBe(20);
	});

	it('ignora a prova já terminada, mesmo que venha primeiro', () => {
		expect(provaActual([
			{ id: 10, jogos: [jogo('2026-09-13', 7)] },                              // acabou
			{ id: 20, jogos: [jogo('2026-10-11'), jogo('2026-10-18')] }              // por começar
		], HOJE)).toBe(20);
	});

	it('não deixa uma prova parada passar à frente — jogos por fechar no passado', () => {
		expect(provaActual([
			{ id: 10, jogos: [jogo('2026-09-05', 1), jogo('2026-09-12')] },           // parada
			{ id: 20, jogos: [jogo('2026-09-20', 4), jogo('2026-10-10')] }            // a meio
		], HOJE)).toBe(20);
	});

	it('se tudo acabou, fica a do último jogo disputado', () => {
		expect(provaActual([
			{ id: 10, jogos: [jogo('2026-09-05', 1)] },
			{ id: 20, jogos: [jogo('2026-09-27', 3)] }
		], HOJE)).toBe(20);
	});

	it('um jogo marcado para hoje conta como futuro', () => {
		expect(provaActual([
			{ id: 10, jogos: [jogo('2026-09-05', 1)] },
			{ id: 20, jogos: [jogo(HOJE)] }
		], HOJE)).toBe(20);
	});

	it('sem provas, devolve nulo', () => {
		expect(provaActual([], HOJE)).toBeNull();
	});
});

// ─── o menu de Competições (P12.1) ──────────────────────────────────────────────────

const c = (
	id: number,
	categoria: string,
	nome: string,
	grupo?: { id: string; nome: string; serie: string }
): Competicao => ({
	id,
	nome,
	categoria,
	grupo_id: grupo?.id,
	grupo_nome: grupo?.nome,
	serie: grupo?.serie ?? null
});

describe('agrupar as provas do menu', () => {
	it('junta as séries do mesmo grupo numa entrada só', () => {
		const { escaloes } = agruparProvas(
			[
				c(1, 'SUB-13', 'CAMP SUB-13 A', { id: 'g1', nome: 'CAMPEONATO SUB-13', serie: 'A' }),
				c(2, 'SUB-13', 'CAMP SUB-13 B', { id: 'g1', nome: 'CAMPEONATO SUB-13', serie: 'B' })
			],
			new Set([1, 2])
		);
		expect(escaloes).toHaveLength(1);
		expect(escaloes[0][1]).toHaveLength(1);
		expect(escaloes[0][1][0].nome).toBe('CAMPEONATO SUB-13');
		expect(escaloes[0][1][0].series).toEqual(['A', 'B']);
	});

	/**
	 * O caso que importa: uma prova a três séries em que duas acabaram **ainda está a
	 * decorrer**. Marcá-la como terminada escondia a série que está a jogar.
	 */
	it('um grupo está vivo se qualquer série sua estiver viva', () => {
		const { escaloes, terminadas } = agruparProvas(
			[
				c(1, 'SUB-15', 'A', { id: 'g', nome: 'CAMPEONATO', serie: 'A' }),
				c(2, 'SUB-15', 'B', { id: 'g', nome: 'CAMPEONATO', serie: 'B' }),
				c(3, 'SUB-15', 'C', { id: 'g', nome: 'CAMPEONATO', serie: 'C' })
			],
			new Set([2])
		);
		expect(escaloes[0][1][0].viva).toBe(true);
		expect(terminadas).toBe(0);
	});

	it('conta as terminadas, e nunca as remove do que devolve', () => {
		const { escaloes, terminadas } = agruparProvas(
			[c(1, 'SUB-17', 'SUPERTAÇA'), c(2, 'SUB-17', 'CAMPEONATO')],
			new Set([2])
		);
		// devolve as duas: quem desenha é que decide esconder, e com o número na mão
		expect(escaloes[0][1]).toHaveLength(2);
		expect(terminadas).toBe(1);
	});

	it('ordena os escalões do mais velho para o mais novo', () => {
		const { escaloes } = agruparProvas(
			[c(1, 'SUB-13', 'x'), c(2, 'SENIORES MASCULINOS', 'y'), c(3, 'SUB-17', 'z')],
			new Set([1, 2, 3])
		);
		expect(escaloes.map(([e]) => e)).toEqual(['SENIORES MASCULINOS', 'SUB-17', 'SUB-13']);
	});

	it('um escalão que a fonte invente vai para o fim, e não desaparece', () => {
		const { escaloes } = agruparProvas(
			[c(1, 'SUB-13', 'x'), c(2, 'VETERANOS', 'y')],
			new Set([1, 2])
		);
		expect(escaloes.map(([e]) => e)).toEqual(['SUB-13', 'VETERANOS']);
	});

	it('nadaVivo quando tudo acabou, e falso quando não há provas nenhumas', () => {
		expect(agruparProvas([c(1, 'SUB-13', 'x')], new Set()).nadaVivo).toBe(true);
		// uma agenda vazia não é "tudo terminado": é não haver nada para dizer
		expect(agruparProvas([], new Set()).nadaVivo).toBe(false);
	});
});

describe('filtrar o que se mostra', () => {
	const dados = agruparProvas(
		[
			c(1, 'SUB-13', 'SUPERTAÇA'),
			c(2, 'SUB-13', 'CAMPEONATO'),
			c(3, 'SUB-19', 'TORNEIO ABERTURA')
		],
		new Set([2])
	);

	it('por omissão só o que está a decorrer', () => {
		const v = filtrarProvas(dados.escaloes, false);
		expect(v.map(([e, p]) => [e, p.map((x) => x.nome)])).toEqual([
			['SUB-13', ['CAMPEONATO']]
		]);
	});

	/**
	 * O erro de 06/10/2026, em forma de teste: o SUB-19 só tem uma prova e ela acabou, logo o
	 * escalão sai da lista filtrada. **Tem de voltar com o interruptor** — foi assim que as
	 * equipas seniores do HC SINTRA desapareceram da app.
	 */
	it('com o interruptor, volta tudo — inclusive um escalão inteiro', () => {
		const v = filtrarProvas(dados.escaloes, true);
		expect(v.map(([e]) => e)).toEqual(['SUB-19', 'SUB-13']);
		expect(v.flatMap(([, p]) => p)).toHaveLength(3);
	});
});

describe('o endereço do menu de Competições', () => {
	it('sem estado nenhum é o caminho simples', () => {
		expect(enderecoDoMenu({})).toBe('/competicoes');
		expect(enderecoDoMenu({ escalao: null, tudo: false })).toBe('/competicoes');
	});

	it('leva o escalão aberto e o interruptor', () => {
		expect(enderecoDoMenu({ escalao: 'sub-19' })).toBe('/competicoes?escalao=sub-19');
		expect(enderecoDoMenu({ tudo: true })).toBe('/competicoes?tudo=1');
		expect(enderecoDoMenu({ escalao: 'escolares', tudo: true })).toBe(
			'/competicoes?escalao=escolares&tudo=1'
		);
	});

	/**
	 * O defeito que isto existe para impedir: fechar o desdobramento não pode apagar o
	 * interruptor, senão quem estava a ver as provas terminadas perde-as ao voltar atrás.
	 */
	it('fechar o escalão preserva o interruptor', () => {
		expect(enderecoDoMenu({ escalao: null, tudo: true })).toBe('/competicoes?tudo=1');
	});
});
