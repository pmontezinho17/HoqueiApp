import { describe, expect, it } from 'vitest';
import { epocaDeNatal, natalNoEndereco } from './natal.svelte';

describe('a época de Natal', () => {
	it('de 1 de dezembro a 6 de janeiro, e mais nada', () => {
		expect(epocaDeNatal('2026-11-30')).toBe(false);
		expect(epocaDeNatal('2026-12-01')).toBe(true);
		expect(epocaDeNatal('2026-12-25')).toBe(true);
		expect(epocaDeNatal('2027-01-06')).toBe(true);
		expect(epocaDeNatal('2027-01-07')).toBe(false);
		expect(epocaDeNatal('2027-07-15')).toBe(false);
	});

	it('o endereço pode mostrá-la antes do tempo, ou escondê-la', () => {
		const u = (q: string) => new URL(`https://testes.hoquei.pages.dev/${q}`);
		expect(natalNoEndereco(u(''), '2026-11-20')).toBe(false);
		expect(natalNoEndereco(u('?natal=1'), '2026-11-20')).toBe(true);
		expect(natalNoEndereco(u('?natal=0'), '2026-12-24')).toBe(false);
		expect(natalNoEndereco(u('?dia=2026-12-24'), '2026-12-24')).toBe(true);
	});
});
