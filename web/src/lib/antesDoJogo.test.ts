import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
	comoFoiJogado,
	diaCurto,
	outraProva,
	linhasDaEpoca,
	linhasDasContagens,
	resumoDosConfrontos,
	sequenciasEmCurso,
	temAntesDoJogo
} from './antesDoJogo';
import type { EquipaAntesDoJogo, Prejogo } from './tipos';

const vezes = (v: number, de: number) => ({ vezes: v, de });

function equipa(nome: string, e: Partial<EquipaAntesDoJogo['epoca']> = {}, s: Partial<EquipaAntesDoJogo['sequencias']> = {}): EquipaAntesDoJogo {
	return {
		equipa: nome,
		ultimos: [],
		epoca: { jogos: 0, vitorias: 0, empates: 0, derrotas: 0, marcados: 0, sofridos: 0, sem_sofrer: 0, sem_marcar: 0, ...e },
		lugares: e.jogos ? { vitorias: 1, marcados: 2, sofridos: 3, diferenca: 1, sem_sofrer: 4 } : {},
		sequencias: {
			resultado: null, sem_perder: 0, sem_ganhar: 0, a_marcar: 0, a_sofrer: 0,
			marcou_primeiro: vezes(0, 0), sofreu_primeiro: vezes(0, 0),
			ganhou_depois_de_marcar_primeiro: vezes(0, 0),
			ganhava_ao_intervalo: vezes(0, 0), perdia_ao_intervalo: vezes(0, 0),
			...s
		}
	};
}

const prejogo = (casa: EquipaAntesDoJogo, fora: EquipaAntesDoJogo, na_serie = 6): Prejogo => ({
	id: 1, na_serie, casa, fora, confrontos: []
});

describe('temAntesDoJogo', () => {
	it('não há separador quando nenhuma das equipas jogou', () => {
		expect(temAntesDoJogo(prejogo(equipa('A'), equipa('B')))).toBe(false);
		expect(temAntesDoJogo(null)).toBe(false);
	});
	it('basta uma ter jogado', () => {
		expect(temAntesDoJogo(prejogo(equipa('A', { jogos: 1, vitorias: 1, marcados: 2 }), equipa('B')))).toBe(true);
	});
});

describe('linhasDaEpoca', () => {
	const a = equipa('A', { jogos: 4, vitorias: 3, empates: 1, marcados: 18, sofridos: 6, sem_sofrer: 1 });
	const b = equipa('B', { jogos: 5, vitorias: 1, derrotas: 4, marcados: 7, sofridos: 20 });
	const linhas = linhasDaEpoca(prejogo(a, b));
	const linha = (r: string) => linhas.find((l) => l.rotulo === r)!;

	it('por jogo, com vírgula e com o sinal na diferença', () => {
		expect(linha('Vitórias').casa.texto).toBe('75%');
		expect(linha('Golos marcados por jogo').casa.texto).toBe('4,5');
		expect(linha('Golos sofridos por jogo').fora.texto).toBe('4,0');
		expect(linha('Diferença de golos por jogo').casa.texto).toBe('+3,0');
		expect(linha('Diferença de golos por jogo').fora.texto).toBe('-2,6');
	});
	it('nos golos sofridos, menos é melhor', () => {
		expect(linha('Golos sofridos por jogo').melhor).toBe('casa');
		expect(linha('Golos marcados por jogo').melhor).toBe('casa');
	});
	it('o número de jogos não tem melhor', () => {
		expect(linha('Jogos').melhor).toBeNull();
	});
	it('os lugares aparecem numa série de três ou mais, e não numa de duas', () => {
		expect(linha('Golos marcados por jogo').casa.lugar).toBe('2.º');
		expect(linha('Jogos').casa.lugar).toBeNull();
		const deDuas = linhasDaEpoca(prejogo(a, b, 2));
		expect(deDuas.every((l) => l.casa.lugar === null && l.fora.lugar === null)).toBe(true);
	});
	it('uma equipa que ainda não jogou tem traços e não zeros', () => {
		const l = linhasDaEpoca(prejogo(a, equipa('C')));
		expect(l.every((x) => x.fora.texto === '—')).toBe(true);
		expect(l.every((x) => x.melhor === null)).toBe(true);
	});
});

describe('linhasDasContagens', () => {
	it('"de" e não percentagem, e a comparação pela proporção', () => {
		const a = equipa('A', { jogos: 1 }, { marcou_primeiro: vezes(1, 1) });
		const b = equipa('B', { jogos: 6 }, { marcou_primeiro: vezes(5, 6), perdia_ao_intervalo: vezes(1, 6) });
		const l = linhasDasContagens(prejogo(a, b));
		const mp = l.find((x) => x.rotulo === 'Marcou primeiro')!;
		expect([mp.casa.texto, mp.fora.texto, mp.melhor]).toEqual(['1 de 1', '5 de 6', 'casa']);
		const pi = l.find((x) => x.rotulo === 'A perder ao intervalo')!;
		expect([pi.casa.texto, pi.melhor]).toEqual(['—', null]);
		// ninguém tem jogos que contem para o "a ganhar ao intervalo": a linha não aparece
		expect(l.some((x) => x.rotulo === 'A ganhar ao intervalo')).toBe(false);
	});
});

describe('sequenciasEmCurso', () => {
	it('não repete o "sem perder" quando é igual à série de vitórias', () => {
		const e = equipa('A', { jogos: 8 }, { resultado: { tipo: 'V', n: 4 }, sem_perder: 4 });
		expect(sequenciasEmCurso(e)).toEqual(['4 vitórias seguidas']);
	});
	it('diz o "sem perder" quando é mais comprido', () => {
		const e = equipa('A', { jogos: 8 }, { resultado: { tipo: 'V', n: 2 }, sem_perder: 5 });
		expect(sequenciasEmCurso(e)).toEqual(['2 vitórias seguidas', '5 jogos sem perder']);
	});
	it('a época inteira diz-se de outra maneira', () => {
		const e = equipa('A', { jogos: 5 }, { resultado: { tipo: 'E', n: 1 }, sem_perder: 5, a_marcar: 5 });
		expect(sequenciasEmCurso(e)).toEqual(['Ainda não perdeu esta época', 'Marcou em todos os jogos']);
	});
	it('abaixo de três jogos seguidos não é sequência, e um resultado só não é série', () => {
		const e = equipa('A', { jogos: 5 }, { resultado: { tipo: 'D', n: 1 }, sem_ganhar: 2, a_sofrer: 2 });
		expect(sequenciasEmCurso(e)).toEqual([]);
	});
});

describe('a lista dos jogos', () => {
	it('o dia sem o dia da semana', () => {
		expect(diaCurto('2026-10-04')).toBe('4 out');
		expect(diaCurto('2026-12-25')).toBe('25 dez');
	});
	it('a prova só quando é outra', () => {
		expect(outraProva({ comp: 449, prova: 'CAMP. REG. SUB-15 - 1ª FASE - SERIE C' }, 449)).toBeNull();
		expect(outraProva({ comp: 430, prova: 'SUPERTAÇA APL SUB-15' }, 449)).toBe('Supertaça Apl Sub-15');
	});
});

describe('confronto directo', () => {
	const j = { id: 1, data: '2026-10-01', comp: 1, prova: 'P', adversario: 'B', marcados: 1, sofridos: 3 };
	it('as equipas onde jogaram, e não onde estão neste jogo', () => {
		expect(comoFoiJogado({ ...j, em_casa: false }, 'A')).toEqual({ casa: 'B', fora: 'A', gc: 3, gf: 1 });
		expect(comoFoiJogado({ ...j, em_casa: true }, 'A')).toEqual({ casa: 'A', fora: 'B', gc: 1, gf: 3 });
	});
	it('contado do lado da casa deste jogo', () => {
		const p = { ...prejogo(equipa('A'), equipa('B')), confrontos: [{ ...j, em_casa: true }, { ...j, em_casa: false, marcados: 2, sofridos: 2 }] };
		expect(resumoDosConfrontos(p)).toEqual({ casa: 0, empates: 1, fora: 1 });
	});
});

/**
 * Contra os `prejogo/` **publicados**, um a um. A regra do projecto: um ecrã com uma mensagem
 * de "não há nada" tem de ter um teste que prove que ela não aparece num caso real — e aqui há
 * duas, o separador que não aparece e o "ainda não se defrontaram".
 */
describe('os prejogo publicados', () => {
	const raiz = new URL('../../static/v1/aplisboa/', import.meta.url);
	const temporadas = existsSync(raiz) ? readdirSync(raiz).sort().reverse() : [];
	const pasta = temporadas.length ? new URL(`${temporadas[0]}/prejogo/`, raiz) : null;
	const todos: Prejogo[] =
		pasta && existsSync(pasta)
			? readdirSync(pasta).map((n) => JSON.parse(readFileSync(new URL(n, pasta), 'utf-8')) as Prejogo)
			: [];

	/**
	 * Contra a agenda só "há algum", e não "um por jogo": no `dev` a agenda chega do `main` a
	 * cada ronda e o `prejogo/` só se refaz no botão do site de testes, por isso os dois andam
	 * desencontrados até à entrega. A conta exacta está no `test_prejogo.py`, sobre a função.
	 */
	it('há prejogo publicados enquanto houver jogos por disputar', () => {
		const agenda = pasta ? new URL('../agenda.json', pasta) : null;
		const jogos: { gc: number | null; cat: string }[] =
			agenda && existsSync(agenda) ? JSON.parse(readFileSync(agenda, 'utf-8')).jogos : [];
		if (!jogos.some((j) => j.gc === null && j.cat !== 'TORNEIOS PARTICULARES')) return;
		expect(todos.length).toBeGreaterThan(0);
	});

	it('quase todos têm separador — medido a 06/11/2026: 260 de 260', () => {
		if (!todos.length) return;
		const com = todos.filter(temAntesDoJogo).length;
		expect(com / todos.length).toBeGreaterThan(0.9);
	});

	it('o "ainda não se defrontaram" não é a regra — medido a 06/11/2026: 232 de 260 já se defrontaram', () => {
		if (!todos.length) return;
		const com = todos.filter((p) => p.confrontos.length).length;
		expect(com / todos.length).toBeGreaterThan(0.5);
	});

	it('nenhum texto sai com NaN, undefined ou Infinity', () => {
		for (const p of todos.filter(temAntesDoJogo)) {
			const textos = [...linhasDaEpoca(p), ...linhasDasContagens(p)].flatMap((l) => [l.casa.texto, l.fora.texto, l.casa.lugar, l.fora.lugar]);
			textos.push(...sequenciasEmCurso(p.casa), ...sequenciasEmCurso(p.fora));
			expect(textos.join(' '), `jogo ${p.id}`).not.toMatch(/NaN|undefined|Infinity/);
		}
	});

	it('os lugares nunca passam do número de equipas da série', () => {
		for (const p of todos)
			for (const e of [p.casa, p.fora])
				for (const l of Object.values(e.lugares)) expect(l, `jogo ${p.id}`).toBeLessThanOrEqual(p.na_serie);
	});
});
