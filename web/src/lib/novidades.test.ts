import { describe, expect, it } from 'vitest';
import { porMostrar } from './novidades.svelte';
import type { Novidade } from './versao';

const lista: Novidade[] = [
	{ versao: '1.3', data: '2026-11-01', pontos: ['c'] },
	{ versao: '1.2', data: '2026-10-20', pontos: ['b'] },
	{ versao: '1.1', data: '2026-10-15', pontos: ['a'] }
];

describe('quando é que a caixa do "o que mudou" aparece', () => {
	/**
	 * Uma lista de alterações a quem nunca usou a app é uma interrupção sem conteúdo, e é a
	 * forma mais rápida de ensinar alguém a fechar caixas sem ler.
	 */
	it('a primeira visita não vê nada', () => {
		expect(porMostrar(null, '1.3', lista)).toEqual([]);
	});

	it('quem já viu esta versão não a vê outra vez', () => {
		expect(porMostrar('1.3', '1.3', lista)).toEqual([]);
	});

	it('quem vinha da anterior vê só o que entrou depois', () => {
		expect(porMostrar('1.2', '1.3', lista).map((n) => n.versao)).toEqual(['1.3']);
	});

	it('quem salta várias versões vê todas as que perdeu', () => {
		expect(porMostrar('1.1', '1.3', lista).map((n) => n.versao)).toEqual(['1.3', '1.2']);
	});

	/** Uma versão guardada que já não existe na lista — depois de uma limpeza, por exemplo. */
	it('uma versão desconhecida mostra a lista inteira, em vez de nada', () => {
		expect(porMostrar('0.9', '1.3', lista)).toHaveLength(3);
	});

	/**
	 * Uma publicação que sobe a versão sem mexer no que o utilizador vê não tem nada para
	 * dizer — e não deve interromper ninguém para o dizer.
	 */
	it('uma versão sem entrada na lista não interrompe ninguém', () => {
		expect(porMostrar('1.3', '1.4', lista)).toEqual([]);
	});
});
