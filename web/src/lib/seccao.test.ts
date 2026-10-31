import { describe, expect, it } from 'vitest';
import { seccaoDe, type Seccao } from './seccao';

/** percorre os caminhos como a pessoa os percorre, cada um a partir do anterior */
const percurso = (...caminhos: string[]) => {
	let anterior: Seccao | null = null;
	return caminhos.map((c) => (anterior = seccaoDe(c, anterior)));
};

describe('a secção acesa na barra de baixo', () => {
	it('as três secções acendem-se a si próprias', () => {
		expect(seccaoDe('/', null)).toBe('/');
		expect(seccaoDe('/clube', '/')).toBe('/clube');
		expect(seccaoDe('/competicoes/sub-13--camp-reg', '/')).toBe('/competicoes');
	});

	it('um jogo aberto a partir dos Jogos fica nos Jogos — era o que se perdia', () => {
		expect(percurso('/', '/jogo/9503')).toEqual(['/', '/']);
	});

	it('uma equipa do Meu Clube fica no Meu Clube, com jogos e separadores pelo meio', () => {
		expect(percurso('/clube', '/equipa/sub-13/parede-fc-a', '/jogo/9503', '/equipa/sub-13/caco-a'))
			.toEqual(['/clube', '/clube', '/clube', '/clube']);
	});

	it('o mesmo jogo é das Competições quando se veio de lá', () => {
		expect(percurso('/competicoes/x', '/jogo/9503')).toEqual(['/competicoes', '/competicoes']);
	});

	it('um link directo acende a secção natural de cada página', () => {
		expect(seccaoDe('/jogo/9503', null)).toBe('/');
		expect(seccaoDe('/equipa/sub-13/caco-a', null)).toBe('/competicoes');
	});

	it('uma página de fora da barra, aberta à entrada, não acende nada', () => {
		expect(seccaoDe('/privacidade', null)).toBeNull();
		// e a meio de um percurso mantém a secção de onde se veio
		expect(percurso('/clube', '/ajuda')).toEqual(['/clube', '/clube']);
	});

	it('um caminho que só comece pelas mesmas letras não é da secção', () => {
		expect(seccaoDe('/clubes-antigos', null)).toBeNull();
	});
});
