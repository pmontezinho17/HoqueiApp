import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { adversario, jogoPrecisaDeMarca, localDoDia, localDoJogo } from './calendario';
import type { Jogo } from './tipos';

/**
 * **O calendário não pode dizer "fora" sobre um jogo que foi em casa.**
 *
 * Um utilizador reportou-o a 17/10/2026 — *"alguns jogos que foram fora aparecem que foram em
 * casa e vice versa"* — e tinha razão: a marca do dia saía do **primeiro** jogo e a célula
 * listava **todos**. O porquê completo está no `calendario.ts`.
 *
 * A parte deste ficheiro que corre contra os dados publicados verdadeiros é a que importa: a
 * suite não monta componentes, por isso o único sítio onde este defeito podia ser apanhado é
 * aqui, com a decisão já fora do `.svelte`.
 */

const jogo = (casa: string, fora: string, id = 1): Jogo =>
	({ id, casa, fora, data: '2026-09-12', hora: '10:00:00', golos_casa: null, golos_fora: null }) as Jogo;

describe('onde é que a equipa joga', () => {
	it('casa quando é ela a receber, fora quando não', () => {
		expect(localDoJogo(jogo('CACO A', 'SL BENFICA'), 'CACO A')).toBe('casa');
		expect(localDoJogo(jogo('SL BENFICA', 'CACO A'), 'CACO A')).toBe('fora');
	});

	it('o adversário é sempre o outro', () => {
		expect(adversario(jogo('CACO A', 'SL BENFICA'), 'CACO A')).toBe('SL BENFICA');
		expect(adversario(jogo('SL BENFICA', 'CACO A'), 'CACO A')).toBe('SL BENFICA');
	});
});

describe('o que a célula do dia pode afirmar', () => {
	it('um dia sem jogos não é um dia em casa', () => {
		expect(localDoDia([], 'CACO A')).toBe('nenhum');
	});

	it('um dia todo em casa, ou todo fora, afirma-o', () => {
		const emCasa = [jogo('CACO A', 'SL BENFICA', 1), jogo('CACO A', 'HC SINTRA', 2)];
		const laFora = [jogo('SL BENFICA', 'CACO A', 3), jogo('HC SINTRA', 'CACO A', 4)];
		expect(localDoDia(emCasa, 'CACO A')).toBe('casa');
		expect(localDoDia(laFora, 'CACO A')).toBe('fora');
	});

	it('um dia com os dois não afirma nenhum — é este o defeito reportado', () => {
		const dia = [jogo('CACO A', 'SL BENFICA', 1), jogo('HC SINTRA', 'CACO A', 2)];
		expect(localDoDia(dia, 'CACO A')).toBe('misto');
	});

	it('num dia misto é o jogo fora que carrega a marca, e só ele', () => {
		const emCasa = jogo('CACO A', 'SL BENFICA', 1);
		const laFora = jogo('HC SINTRA', 'CACO A', 2);
		const dia = [emCasa, laFora];
		expect(jogoPrecisaDeMarca(dia, 'CACO A', laFora)).toBe(true);
		expect(jogoPrecisaDeMarca(dia, 'CACO A', emCasa)).toBe(false);
	});

	it('num dia inteiro fora nenhum jogo repete a marca: a célula já a deu', () => {
		const dia = [jogo('SL BENFICA', 'CACO A', 3), jogo('HC SINTRA', 'CACO A', 4)];
		expect(jogoPrecisaDeMarca(dia, 'CACO A', dia[0])).toBe(false);
	});
});

describe('contra os dados publicados', () => {
	const raiz = new URL('../../static/v1/aplisboa/', import.meta.url);
	const temporadas = existsSync(raiz) ? readdirSync(raiz).sort().reverse() : [];
	const base = temporadas.length ? new URL(`${temporadas[0]}/`, raiz) : null;

	/** Dias-equipa, agrupados por escalão — que é como o ecrã os vê: uma equipa de cada vez. */
	const dias = (() => {
		const m = new Map<string, Jogo[]>();
		if (!base) return m;
		const pasta = new URL('comp/', base);
		if (!existsSync(pasta)) return m;
		const vistos = new Set<number>();
		for (const f of readdirSync(pasta).filter((x) => x.endsWith('.json'))) {
			const d = JSON.parse(readFileSync(new URL(f, pasta), 'utf-8'));
			const cat = d?.competicao?.categoria ?? '?';
			for (const j of (d?.jogos ?? []) as Jogo[]) {
				if (!j?.id || !j.data || !j.casa || !j.fora) continue;
				if (vistos.has(j.id)) continue; // a mesma prova aparece em mais do que um ficheiro
				vistos.add(j.id);
				for (const equipa of [j.casa, j.fora]) {
					const chave = `${cat}\u0000${equipa}\u0000${j.data}`;
					(m.get(chave) ?? m.set(chave, []).get(chave)!).push(j);
				}
			}
		}
		return m;
	})();

	it('nenhum dia é rotulado com um local que algum dos seus jogos desminta', () => {
		const mentiras: string[] = [];
		for (const [chave, js] of dias) {
			const [, equipa] = chave.split('\u0000');
			const doDia = localDoDia(js, equipa);
			if (doDia === 'misto' || doDia === 'nenhum') continue;
			for (const j of js)
				if (localDoJogo(j, equipa) !== doDia) mentiras.push(`${chave.replace(/\u0000/g, ' · ')}`);
		}
		expect(mentiras).toEqual([]);
	});

	it('a condição que isto protege existe mesmo nos dados, senão a rede não está a ser testada', () => {
		// Se um dia isto falhar, não é defeito: é a época a não ter nenhum dia com casa e fora
		// para a mesma equipa. Nessa altura confirma-se nos dados e empurra-se a verificação,
		// por escrito — não se apaga. A 20/10/2026 eram 67 dias em 1 529, e o caso reportado
		// (`SUB-17 · CACO A`, 12/09) era um deles.
		const mistos = [...dias].filter(([chave, js]) => localDoDia(js, chave.split('\u0000')[1]) === 'misto');
		expect(mistos.length).toBeGreaterThan(0);
	});
});
