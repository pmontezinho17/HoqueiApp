import { describe, expect, it } from 'vitest';
import { destinoDeVoltar, recuarNaHistoria, veioDeDentro } from './voltar';

/**
 * **A seta de voltar tem de voltar para onde a pessoa estava.**
 *
 * Reportado por um utilizador a 18/10/2026: *"Estou dentro do menu da equipa. Escolho um jogo
 * para ver os detalhes. Se carrego para voltar para trás, volta ao menu principal, não ao menu
 * onde se estava."* O porquê completo está no `voltar.ts`.
 */

describe('para onde vai a seta quando não há história', () => {
	it('para o dia deste jogo, e não para hoje', () => {
		expect(destinoDeVoltar('2026-10-24')).toBe('/?dia=2026-10-24');
	});

	it('sem data, para a lista de jogos', () => {
		expect(destinoDeVoltar(null)).toBe('/');
		expect(destinoDeVoltar(undefined)).toBe('/');
		expect(destinoDeVoltar('')).toBe('/');
	});
});

describe('recuar na história ou seguir o endereço', () => {
	it('viemos de dentro da app: recua-se, e a pessoa volta ao ecrã onde estava', () => {
		expect(recuarNaHistoria(true)).toBe(true);
		expect(recuarNaHistoria(true, { botao: 0 })).toBe(true);
	});

	it('chegámos de fora: não há história, segue-se o endereço', () => {
		expect(recuarNaHistoria(false)).toBe(false);
		expect(recuarNaHistoria(false, { botao: 0 })).toBe(false);
	});

	it('um clique com modificador quer abrir noutro sítio, e não é a seta que o decide', () => {
		for (const mod of [{ meta: true }, { ctrl: true }, { shift: true }, { alt: true }])
			expect(recuarNaHistoria(true, mod)).toBe(false);
	});

	it('o botão do meio abre num separador novo: também não se intercepta', () => {
		expect(recuarNaHistoria(true, { botao: 1 })).toBe(false);
		expect(recuarNaHistoria(true, { botao: 2 })).toBe(false);
	});
});

describe('viemos de dentro da app?', () => {
	it('um arranque da app não é navegação de dentro, venha o que vier no `from`', () => {
		expect(veioDeDentro('enter', null)).toBe(false);
		// medido no servidor de desenvolvimento a 20/10/2026: num recarregamento o `from` vinha
		// preenchido, e foi isso que fez a primeira versão desta seta recuar quando não devia
		expect(veioDeDentro('enter', { url: '/qualquer' })).toBe(false);
	});

	it('um link, um goto, um popstate ou um form são navegação de dentro', () => {
		for (const tipo of ['link', 'goto', 'popstate', 'form'])
			expect(veioDeDentro(tipo, { url: '/equipa/sub-17/caco-a' })).toBe(true);
	});

	it('sem `from` não há para onde recuar, qualquer que seja o tipo', () => {
		expect(veioDeDentro('link', null)).toBe(false);
		expect(veioDeDentro('popstate', undefined)).toBe(false);
	});

	it('um tipo desconhecido cai do lado seguro: segue o endereço', () => {
		expect(veioDeDentro(null, { url: '/x' })).toBe(false);
		expect(veioDeDentro(undefined, { url: '/x' })).toBe(false);
	});
});
