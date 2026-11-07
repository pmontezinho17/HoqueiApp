import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { nomeDaParte, temposDaCronologia } from './cronologia';
import type { EventoJogo, FichaJogo } from './tipos';

let ordem = 0;
function ev(tipo: EventoJogo['tipo'], relogio: string | null, parte: number | null, texto = ''): EventoJogo {
	return {
		ordem: ordem++, tipo, relogio, parte, minuto: null, equipa: null, jogador: null,
		assistencia: null, variante: null, numero: null, golos_casa: null, golos_fora: null, texto
	};
}

describe('temposDaCronologia', () => {
	it('mostra o relógio da parte, a descer, e não o minuto corrido', () => {
		ordem = 0;
		const eventos = [
			ev('inicio_parte', '18:00', 1, 'Início da 1ª Parte'),
			ev('golo', '11:17', 1),
			ev('fim_parte', '0:00', 1),
			ev('inicio_parte', '18:00', 2, 'Início da 2ª parte'),
			ev('golo', '9:02', 2)
		];
		const t = temposDaCronologia(eventos);
		expect(t.get(1)).toEqual({ relogio: '11:17', parte: '1ª' });
		expect(t.get(4)).toEqual({ relogio: '9:02', parte: '2ª' });
		// as marcas de estrutura não levam tempo
		expect(t.has(0)).toBe(false);
		expect(t.has(2)).toBe(false);
	});

	it('o relógio maior do que a parte é um erro da mesa, e não se mostra', () => {
		ordem = 0;
		const t = temposDaCronologia([
			ev('inicio_parte', '18:00', 1, 'Início da 1ª Parte'),
			ev('desconto_tempo', '34:00', 1)
		]);
		expect(t.has(1)).toBe(false);
	});

	it('o desempate por penáltis não tem relógio', () => {
		ordem = 0;
		const t = temposDaCronologia([ev('inicio_parte', '3:00', 2, 'x'), ev('golo', 'PTY', 2)]);
		expect(t.has(1)).toBe(false);
	});

	it('no prolongamento a parte diz que é do prolongamento', () => {
		ordem = 0;
		const inicio = ev('inicio_parte', '5:00', 1, 'Início da 1ª parte do tempo extra');
		const t = temposDaCronologia([inicio, ev('golo', '2:10', 1)]);
		expect(t.get(1)?.parte).toBe('1ª prol.');
		expect(nomeDaParte(inicio)).toBe('1ª parte do prolongamento');
		expect(nomeDaParte(ev('inicio_parte', '25:00', 2, 'Início da 2ª parte'))).toBe('2ª parte');
	});
});

describe('as fichas publicadas', () => {
	const pasta = new URL('../../static/v1/aplisboa/2026-27/match/', import.meta.url);
	const fichas: FichaJogo[] = existsSync(pasta)
		? readdirSync(pasta).map((n) => JSON.parse(readFileSync(new URL(n, pasta), 'utf-8')) as FichaJogo)
		: [];
	const segundos = (r: string) => Number(r.split(':')[0]) * 60 + Number(r.split(':')[1]);

	/**
	 * A regra do dono a 07/11/2026: *"num jogo de sub-13, as duas partes foram de 18 minutos,
	 * e cada evento é sempre inferior ao 18"*. Verificado em todos os escalões, e não só no
	 * dele — as partes vão de 3 a 45 minutos.
	 */
	it.skipIf(!fichas.length)('nenhum tempo mostrado passa da duração da sua parte', () => {
		let vistos = 0;
		for (const f of fichas) {
			const eventos = (f.cronologia ?? []) as EventoJogo[];
			const tempos = temposDaCronologia(eventos);
			let duracao: number | null = null;
			for (const e of eventos) {
				if (e.tipo === 'inicio_parte' && e.relogio) duracao = segundos(e.relogio);
				const t = tempos.get(e.ordem);
				if (!t || duracao === null) continue;
				vistos++;
				expect(segundos(t.relogio), `jogo ${f.id}, evento ${e.ordem}`).toBeLessThanOrEqual(duracao);
			}
		}
		// quase todos os eventos com relógio ficam com ele: medido a 07/11, 13 786 de 13 802
		expect(vistos).toBeGreaterThan(10_000);
	});

	it.skipIf(!fichas.length)('dentro de cada parte o tempo só desce', () => {
		let subidas = 0;
		for (const f of fichas) {
			const eventos = (f.cronologia ?? []) as EventoJogo[];
			const tempos = temposDaCronologia(eventos);
			let anterior = Infinity;
			for (const e of eventos) {
				if (e.tipo === 'inicio_parte') anterior = Infinity;
				const t = tempos.get(e.ordem);
				if (!t) continue;
				if (segundos(t.relogio) > anterior) subidas++;
				anterior = segundos(t.relogio);
			}
		}
		expect(subidas).toBe(0);
	});
});
