import { describe, expect, it } from 'vitest';
import { interpretar } from './favoritos.svelte';

const bom = { equipa: 'AD OEIRAS A', categoria: 'BENJAMINS', competicoes: [465] };

/**
 * O P11.8, que não era hipótese: um favorito guardado por uma versão anterior — sem
 * `competicoes` — fazia o `/clube` abrir **sem cartões, sem convite e sem erro à vista**.
 * O `as Favorito[]` que lá estava é uma promessa ao compilador, não uma verificação.
 */
describe('ler os favoritos do armazenamento', () => {
	it('deixa passar um favorito completo', () => {
		expect(interpretar(JSON.stringify([bom]))).toEqual([bom]);
	});

	it('descarta o favorito da forma antiga, sem competições', () => {
		const antigo = { equipa: 'SC TOMAR', categoria: 'SUB-17' };
		expect(interpretar(JSON.stringify([antigo, bom]))).toEqual([bom]);
	});

	it('descarta o que tem a forma certa e o conteúdo errado', () => {
		const maus = [
			{ equipa: '', categoria: 'SUB-13', competicoes: [1] },
			{ equipa: 'X', categoria: '', competicoes: [1] },
			{ equipa: 'X', categoria: 'SUB-13', competicoes: 'nenhuma' },
			{ equipa: 'X', categoria: 'SUB-13', competicoes: [null] },
			{ equipa: 'X', categoria: 'SUB-13', competicoes: ['465'] },
			{ equipa: 42, categoria: 'SUB-13', competicoes: [1] },
			null,
			'uma string',
			7
		];
		expect(interpretar(JSON.stringify([...maus, bom]))).toEqual([bom]);
	});

	it('nada guardado, JSON corrompido ou um objecto em vez de uma lista dão lista vazia', () => {
		expect(interpretar(null)).toEqual([]);
		expect(interpretar('')).toEqual([]);
		expect(interpretar('{isto não é json')).toEqual([]);
		// um `filter` sobre isto rebentava: tem de ser uma lista, não um objecto
		expect(interpretar('{"equipa":"X"}')).toEqual([]);
		expect(interpretar('null')).toEqual([]);
	});

	/**
	 * A app chama o `resumir()` em cima disto, e é lá que o `flatMap` rebentava. Este teste
	 * guarda a propriedade que importa: **o que sai daqui é sempre seguro de usar**.
	 */
	it('tudo o que sai tem as três chaves com o tipo certo', () => {
		const saida = interpretar(
			JSON.stringify([bom, { equipa: 'Y', categoria: 'SUB-15' }, { nada: true }])
		);
		for (const f of saida) {
			expect(typeof f.equipa).toBe('string');
			expect(typeof f.categoria).toBe('string');
			expect(f.competicoes.every((c) => typeof c === 'number')).toBe(true);
		}
	});
});
