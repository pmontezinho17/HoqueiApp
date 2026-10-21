import { describe, expect, it } from 'vitest';
import { tipoDeAparelho } from './aparelho.js';

/**
 * **O rótulo do aparelho, a partir do `User-Agent`.**
 *
 * Pedido do dono a 21/10/2026. As cadeias aqui são reais, copiadas do que os browsers mandam —
 * inventar um `User-Agent` para o teste passar seria testar a minha imaginação. O porquê das
 * escolhas, e dos limites, está no `aparelho.ts`.
 */
describe('o tipo de aparelho', () => {
	it('iPhone', () => {
		expect(
			tipoDeAparelho(
				'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 ' +
					'(KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
			)
		).toBe('ios');
	});

	it('iPhone com o Chrome, que ainda é iOS por baixo', () => {
		// Na Apple todos os browsers usam o WebKit; o que muda é o nome na cadeia.
		expect(
			tipoDeAparelho(
				'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 ' +
					'(KHTML, like Gecko) CriOS/126.0 Mobile/15E148 Safari/604.1'
			)
		).toBe('ios');
	});

	it('Android', () => {
		expect(
			tipoDeAparelho(
				'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) ' +
					'Chrome/126.0.0.0 Mobile Safari/537.36'
			)
		).toBe('android');
	});

	it('e o Android vem antes do Linux, porque se anuncia como Linux', () => {
		// É o caso que a ordem dos testes resolve. Trocada, todos os Android viravam computador.
		const android = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36';
		expect(tipoDeAparelho(android)).toBe('android');
		expect(android.toLowerCase()).toContain('linux');
	});

	it('Windows, Mac e Linux de secretária', () => {
		for (const ua of [
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36',
			'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.5 Safari/605.1.15',
			'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36'
		])
			expect(tipoDeAparelho(ua)).toBe('computador');
	});

	it('o iPad conta como computador, e isso está assumido', () => {
		// Desde o iPadOS 13 o Safari do iPad anuncia-se como Macintosh. Distingui-lo exigiria
		// adivinhar pelo toque, que o servidor não vê. Fica errado e honesto.
		expect(
			tipoDeAparelho(
				'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 ' +
					'(KHTML, like Gecko) Version/17.5 Safari/605.1.15'
			)
		).toBe('computador');
	});

	it('sem cabeçalho, vazio ou irreconhecível é `outro` e nunca rebenta', () => {
		expect(tipoDeAparelho(null)).toBe('outro');
		expect(tipoDeAparelho(undefined)).toBe('outro');
		expect(tipoDeAparelho('')).toBe('outro');
		expect(tipoDeAparelho('   ')).toBe('outro');
	});

	it('uma consola ou uma televisão também são `outro`', () => {
		expect(tipoDeAparelho('Mozilla/5.0 (PlayStation 5/2.26) AppleWebKit/605.1.15')).toBe('outro');
		expect(tipoDeAparelho('Roku4640X/DVP-7.70 (297.70E04154A)')).toBe('outro');
	});
});
