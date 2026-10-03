import { describe, expect, it } from 'vitest';
import { clube, escalao } from './nomes';

describe('clube', () => {
	it('põe em caixa de título sem estragar as siglas', () => {
		expect(clube('CD PAÇO ARCOS B')).toBe('CD Paço Arcos B');
		expect(clube('FSE/AJ SALESIANA')).toBe('FSE/AJ Salesiana');
		expect(clube('SPORTING CP A')).toBe('Sporting CP A');
		expect(clube('UD VILAFRANQUENSE')).toBe('UD Vilafranquense');
	});

	it('deixa em paz uma sigla curta que não conhece', () => {
		// mais vale ficar maiúscula do que "APAC" virar "Apac"
		expect(clube('APAC TOJAL')).toBe('APAC Tojal');
		expect(clube('XYZ QUALQUER')).toBe('XYZ Qualquer');
	});

	it('trata os códigos entre parênteses e o hífen', () => {
		expect(clube('AE FISICA D (S13)')).toBe('AE Fisica D (S13)');
		expect(clube('CRIAR-T GD')).toBe('Criar-T GD');
	});
});

describe('escalao', () => {
	it('mantém o hífen e capitaliza cada parte', () => {
		expect(escalao('SUB-13')).toBe('Sub-13');
		expect(escalao('SENIORES MASCULINOS')).toBe('Seniores Masculinos');
		expect(escalao('ESCOLARES')).toBe('Escolares');
	});
});
