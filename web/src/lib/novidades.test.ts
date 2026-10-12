import { describe, expect, it } from 'vitest';
import { aReabrir, porMostrar } from './novidades.svelte';
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

describe('quando alguém pede para ver as novidades outra vez', () => {
	/**
	 * Pedido pelo dono a 12/10/2026, depois de fechar a caixa sem querer. É outra pergunta que
	 * a do `porMostrar`, e por isso tem outra resposta: ali a resposta certa é quase sempre
	 * "nada", aqui **nunca** pode ser nada — um botão que não faz nada é pior do que não haver
	 * botão nenhum.
	 */
	it('mostra o que entrou nesta versão', () => {
		expect(aReabrir('1.2', lista).map((n) => n.versao)).toEqual(['1.2']);
	});

	it('a marca do aparelho não entra nesta conta — ele pediu para ver', () => {
		/** O contraste com o `porMostrar`, que a esta mesma versão responderia `[]`. */
		expect(porMostrar('1.3', '1.3', lista)).toEqual([]);
		expect(aReabrir('1.3', lista)).toHaveLength(1);
	});

	it('uma versão sem notas cai na última coisa que mudou, em vez de não abrir nada', () => {
		/**
		 * É o caso de uma publicação que só mexeu no raspador ou num workflow: sobe o número
		 * e não escreve novidades, de propósito. A linha do menu tem de continuar a dizer
		 * alguma coisa.
		 */
		expect(aReabrir('1.4', lista).map((n) => n.versao)).toEqual(['1.3']);
	});

	it('sem lista nenhuma devolve nada — e aí o menu esconde a linha', () => {
		expect(aReabrir('1.0', [])).toEqual([]);
	});
});
