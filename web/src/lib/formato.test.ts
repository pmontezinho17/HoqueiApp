import { describe, expect, it } from 'vitest';
import { faseCurta, nomeProprio } from './formato';

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

describe('faseCurta', () => {
	it('encurta a parte para caber na coluna da linha de jogo', () => {
		expect(faseCurta({ periodo: '2ª Parte' })).toBe('2ª p');
		expect(faseCurta({ periodo: '4ª Parte' })).toBe('4ª p');
	});

	it('aceita o "a" que a fonte às vezes manda em vez do ordinal', () => {
		expect(faseCurta({ periodo: '1a Parte' })).toBe('1ª p');
	});

	it('abrevia o intervalo, que é quando não há relógio para mostrar', () => {
		expect(faseCurta({ periodo: 'Intervalo' })).toBe('Interv.');
	});

	it('cai para a situação quando o período não foi separado', () => {
		expect(faseCurta({ periodo: null, situacao: '1ª Parte (13:26)' })).toBe('1ª p');
	});

	it('prefere o período à situação quando há os dois', () => {
		expect(faseCurta({ periodo: '3ª Parte', situacao: 'Intervalo' })).toBe('3ª p');
	});

	it('devolve null sem dados, para a linha voltar a dizer AO VIVO', () => {
		expect(faseCurta({})).toBeNull();
		expect(faseCurta({ periodo: null, situacao: null })).toBeNull();
		expect(faseCurta({ periodo: '   ' })).toBeNull();
	});

	it('não deixa passar um texto longo desconhecido, que partia a coluna em três linhas', () => {
		expect(faseCurta({ situacao: 'Jogo interrompido por falta de luz' })).toBeNull();
		expect(faseCurta({ situacao: 'Suspenso' })).toBe('Suspenso');
	});
});
