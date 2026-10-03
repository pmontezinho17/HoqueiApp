import { type Dirent, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Guarda contra um bug que já apareceu **três vezes** em sítios diferentes.
 *
 * Numa tabela que rola na horizontal, as primeiras colunas ficam presas com `position:
 * sticky`. A segunda tem de encostar exactamente onde a primeira acaba — e a tentação é
 * escrever esse valor à mão (`left: 2.4rem`), igual à largura que se pediu à primeira.
 *
 * Não funciona, porque numa tabela `width` é uma **sugestão**: a coluna do número
 * renderizava 38px numa ficha e 29px noutra, consoante as camisolas tivessem um ou dois
 * dígitos, enquanto o nome continuava pregado a 2,4rem — e tapava 9px da coluna dos golos.
 *
 * A regra: um encosto de coluna fixa é `0` (é a primeira) ou vem de uma variável partilhada
 * com a largura da coluna anterior. Nunca um número solto.
 */
const SRC = new URL('..', import.meta.url).pathname;

function svelte(pasta: string): string[] {
	return readdirSync(pasta, { withFileTypes: true }).flatMap((e: Dirent) =>
		e.isDirectory()
			? svelte(join(pasta, e.name))
			: e.name.endsWith('.svelte')
				? [join(pasta, e.name)]
				: []
	);
}

/** Regras que são `position: sticky` com um `left` que é um comprimento literal. */
export function encostosLiterais(css: string): string[] {
	const maus: string[] = [];
	for (const [, , seletor, corpo] of css.matchAll(/(^|\})?\s*([^{}]+)\{([^}]*)\}/g)) {
		if (!/position:\s*sticky/.test(corpo)) continue;
		const m = corpo.match(/left:\s*([^;}]+)/);
		if (!m) continue;
		const valor = m[1].trim();
		if (valor === '0' || valor.startsWith('var(') || valor === 'auto') continue;
		maus.push(`${seletor.trim().split('\n').pop()?.trim()} { left: ${valor} }`);
	}
	return maus;
}

describe('colunas fixas', () => {
	it('nenhum encosto é um número solto', () => {
		const maus: string[] = [];
		for (const f of svelte(SRC)) {
			const css = readFileSync(f, 'utf8').split('<style>')[1] ?? '';
			for (const regra of encostosLiterais(css)) maus.push(`${f.replace(SRC, '')}: ${regra}`);
		}
		expect(maus, 'um encosto literal deixa de casar quando a coluna muda de largura').toEqual(
			[]
		);
	});

	it('o próprio detector funciona', () => {
		// senão um teste que não detecta nada passa para sempre
		expect(encostosLiterais('.nome { position: sticky; left: 2.4rem; }')).toEqual([
			'.nome { left: 2.4rem }'
		]);
		expect(encostosLiterais('.n { position: sticky; left: 0; }')).toEqual([]);
		expect(encostosLiterais('.nome { position: sticky; left: var(--coluna-n); }')).toEqual([]);
		// um `left` fora de uma coluna fixa não é problema nenhum
		expect(encostosLiterais('.salto { position: absolute; left: 0.5rem; }')).toEqual([]);
	});
});
