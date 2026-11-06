import { describe, expect, it } from 'vitest';
import { precisaDeRolar } from './rolar';

describe('uma tabela só rola quando não cabe', () => {
	it('a que cabe deixa o arrasto para a mudança de separador — era o Plantel do dono', () => {
		expect(precisaDeRolar(343, 343)).toBe(false);
	});

	it('a que não cabe rola, como a classificação completa', () => {
		expect(precisaDeRolar(520, 343)).toBe(true);
	});

	it('um píxel de arredondamento não conta como não caber', () => {
		expect(precisaDeRolar(344, 343)).toBe(false);
		expect(precisaDeRolar(345, 343)).toBe(true);
	});
});
