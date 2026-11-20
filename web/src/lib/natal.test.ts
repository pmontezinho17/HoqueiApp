import { describe, expect, it } from 'vitest';
import { carregarNatal, epocaDeNatal, escolherNatal, natal, natalNoEndereco } from './natal.svelte';

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

describe('desligar os enfeites', () => {
	const armazem = () => {
		const m = new Map<string, string>();
		return { m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v),
			removeItem: (k: string) => void m.delete(k) };
	};

	it('automático é a omissão e não deixa nada escrito', () => {
		const a = armazem();
		carregarNatal(a);
		expect(natal.desligado).toBe(false);
		escolherNatal(true, a);
		expect(a.m.size).toBe(0);
	});

	it('desligados fica guardado, e volta-se ao automático apagando a chave', () => {
		const a = armazem();
		escolherNatal(false, a);
		expect(a.m.get('hoquei:natal:v1')).toBe('desligado');
		natal.desligado = false;
		carregarNatal(a);
		expect(natal.desligado).toBe(true);
		escolherNatal(true, a);
		expect(a.m.has('hoquei:natal:v1')).toBe(false);
		expect(natal.desligado).toBe(false);
	});

	it('um armazenamento bloqueado não parte nada', () => {
		const partido = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('x'); },
			removeItem: () => { throw new Error('x'); } };
		expect(() => carregarNatal(partido)).not.toThrow();
		expect(() => escolherNatal(false, partido)).not.toThrow();
		expect(natal.desligado).toBe(true);
		natal.desligado = false;
	});
});
