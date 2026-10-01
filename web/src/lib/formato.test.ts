import { describe, expect, it } from 'vitest';
import { nomeProprio } from './formato';

describe('nomeProprio', () => {
	it('põe em caixa de título o que a fonte publica em maiúsculas', () => {
		expect(nomeProprio('SALVADOR MONTEZINHO')).toBe('Salvador Montezinho');
	});

	it('mantém os acentos que a fonte já traz', () => {
		expect(nomeProprio('JOÃO GONÇALVES')).toBe('João Gonçalves');
	});

	it('deixa as partículas em minúscula', () => {
		expect(nomeProprio('VASCO DE SOUSA')).toBe('Vasco de Sousa');
		expect(nomeProprio('MARIA DOS SANTOS E SILVA')).toBe('Maria dos Santos e Silva');
	});

	it('não baixa uma partícula que abra o nome', () => {
		expect(nomeProprio('DA SILVA JUNIOR')).toBe('Da Silva Junior');
	});

	it('recupera a maiúscula depois de hífen e de apóstrofo', () => {
		expect(nomeProprio("D'ÁVILA")).toBe("D'Ávila");
		expect(nomeProprio('ANA VILA-CHÃ')).toBe('Ana Vila-Chã');
	});

	it('não mexe num nome que já venha escrito com critério', () => {
		expect(nomeProprio('Salvador MonteZinho')).toBe('Salvador MonteZinho');
		expect(nomeProprio('Vasco de Sousa')).toBe('Vasco de Sousa');
	});

	it('aguenta vazio e nulo', () => {
		expect(nomeProprio(null)).toBe('');
		expect(nomeProprio('')).toBe('');
	});

	it('preserva o espaçamento interior', () => {
		expect(nomeProprio('ANA  SILVA')).toBe('Ana  Silva');
	});
});
