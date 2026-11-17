import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { escolhasDaLiga, filtrarDoDia, ligaDoJogo, opcoesDeLiga } from './ligas';
import type { JogoAgenda } from './tipos';

const j = (o: Partial<JogoAgenda>): JogoAgenda =>
	({ id: 1, data: '2026-11-14', hora: '18:00', casa: 'A', fora: 'B', gc: null, gf: null,
		recinto: null, comp: 1, prova: 'P', cat: 'SUB-13', ...o }) as JogoAgenda;

const SABADO = [
	j({ cat: 'SUB-13' }), j({ cat: 'SUB-13' }), j({ cat: 'BENJAMINS' }),
	j({ inq: 'fpp', cat: '1.ª DIVISÃO', serie: null }),
	j({ inq: 'fpp', cat: '2.ª DIVISÃO', serie: 'NORTE' }), j({ inq: 'fpp', cat: '2.ª DIVISÃO', serie: 'SUL' }),
	j({ inq: 'fpp', cat: '3.ª DIVISÃO', serie: 'NORTE A' }), j({ inq: 'fpp', cat: '3.ª DIVISÃO', serie: 'SUL B' })
];

describe('os botões das ligas', () => {
	it('"Todos" à frente, a APL e depois as divisões de cima para baixo, cada uma com quantos', () => {
		expect(opcoesDeLiga(SABADO).map((o) => `${o.rotulo} ${o.n}`)).toEqual([
			'Todos 8', 'APL 3', 'Placard 1', '2.ª Divisão 2', '3.ª Divisão 2'
		]);
	});

	it('a APL é uma liga só, com os escalões dentro', () => {
		expect(ligaDoJogo({ cat: 'SUB-13' })).toBe('APL');
		expect(ligaDoJogo({ inq: 'fpp', cat: '2.ª DIVISÃO' })).toBe('2.ª DIVISÃO');
	});
});

describe('a lista ao lado muda com a liga — o ajuste do dono a 17/11/2026', () => {
	const rotulos = (l: string | null) => escolhasDaLiga(SABADO, l)?.opcoes.map((o) => o.rotulo) ?? null;

	it('na APL, os escalões', () => {
		expect(escolhasDaLiga(SABADO, 'APL')?.todos).toBe('Todos os escalões');
		expect(rotulos('APL')).toEqual(['BENJAMINS', 'SUB-13']);
	});

	it('numa divisão, as zonas', () => {
		expect(escolhasDaLiga(SABADO, '2.ª DIVISÃO')?.todos).toBe('Todas as zonas');
		expect(rotulos('2.ª DIVISÃO')).toEqual(['Zona Norte', 'Zona Sul']);
		expect(rotulos('3.ª DIVISÃO')).toEqual(['Zona Norte A', 'Zona Sul B']);
	});

	it('no Placard, nada: é uma prova só', () => {
		expect(escolhasDaLiga(SABADO, '1.ª DIVISÃO')).toBeNull();
	});

	it('uma zona só, num dia, também não é escolha', () => {
		expect(escolhasDaLiga(SABADO.filter((x) => x.serie !== 'SUL'), '2.ª DIVISÃO')).toBeNull();
	});

	it('em "Todos", os escalões e as divisões do dia, como a lista sempre foi', () => {
		expect(rotulos(null)).toEqual(['BENJAMINS', 'SUB-13', '1.ª DIVISÃO', '2.ª DIVISÃO', '3.ª DIVISÃO']);
	});
});

describe('filtrar', () => {
	it('pela liga e pela zona', () => {
		expect(filtrarDoDia(SABADO, '2.ª DIVISÃO', null)).toHaveLength(2);
		expect(filtrarDoDia(SABADO, '2.ª DIVISÃO', 'SUL').map((x) => x.serie)).toEqual(['SUL']);
		expect(filtrarDoDia(SABADO, 'APL', 'SUB-13')).toHaveLength(2);
	});

	it('um dia sem a liga escolhida mostra tudo, para o vizinho na faixa não ficar vazio a meio do gesto', () => {
		const domingo = SABADO.filter((x) => x.inq !== 'fpp');
		expect(filtrarDoDia(domingo, '2.ª DIVISÃO', 'SUL')).toEqual(domingo);
	});
});

/**
 * Com os dados publicados: **todos os dias com jogos nacionais têm a escolha certa para cada
 * divisão**. Salta enquanto a FPP não estiver na árvore (no `dev` não está commitada).
 */
describe('nos dados publicados', () => {
	const ler = (fonte: string) => {
		const u = new URL(`../../static/v1/${fonte}/2026-27/agenda.json`, import.meta.url);
		return existsSync(u) ? (JSON.parse(readFileSync(u, 'utf-8')).jogos as JogoAgenda[]) : null;
	};
	const apl = ler('aplisboa');
	const fpp = ler('fpp');

	it.skipIf(!apl || !fpp)('cada zona de cada dia aparece, e nenhum jogo nacional fica sem zona', () => {
		const todos = [...apl!, ...fpp!.map((x) => ({ ...x, inq: 'fpp' as const }))];
		const dias = new Set(fpp!.map((x) => x.data));
		let vistas = 0;
		for (const d of dias) {
			const doDia = todos.filter((x) => x.data === d);
			for (const div of ['2.ª DIVISÃO', '3.ª DIVISÃO']) {
				const jogos = doDia.filter((x) => x.inq === 'fpp' && x.cat === div);
				expect(jogos.every((x) => x.serie), `${d} ${div}`).toBe(true);
				const zonas = new Set(jogos.map((x) => x.serie));
				const e = escolhasDaLiga(doDia, div);
				expect(e?.opcoes.length ?? 0, `${d} ${div}`).toBe(zonas.size > 1 ? zonas.size : 0);
				vistas += zonas.size;
			}
			expect(escolhasDaLiga(doDia, '1.ª DIVISÃO'), d).toBeNull();
		}
		expect(vistas).toBeGreaterThan(10);
	});
});
