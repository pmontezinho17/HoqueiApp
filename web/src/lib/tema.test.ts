import { describe, expect, it } from 'vitest';
import { interpretar } from './tema.svelte';

/**
 * A leitura do que está guardado vive fora da classe para poder ser testada sem DOM.
 *
 * O que importa aqui é que **tudo o que não seja uma escolha válida cai no tema do
 * sistema**: a chave é escrita por nós, mas é lida de um `localStorage` que qualquer
 * extensão, versão antiga ou dedo na consola pode ter mexido. Foi um favorito com a forma
 * antiga que partiu o `/clube` em silêncio (P11.8), e a lição é esta.
 */
describe('o tema guardado', () => {
	it('aceita as duas escolhas que contrariam o sistema', () => {
		expect(interpretar('claro')).toBe('claro');
		expect(interpretar('escuro')).toBe('escuro');
	});

	it('sem nada guardado, segue o sistema', () => {
		expect(interpretar(null)).toBe('sistema');
	});

	it('lixo guardado não parte nada — segue o sistema', () => {
		expect(interpretar('')).toBe('sistema');
		expect(interpretar('dark')).toBe('sistema');
		expect(interpretar('{"tema":"escuro"}')).toBe('sistema');
	});

	/**
	 * `sistema` nunca é escrito: escolher "Sistema" apaga a chave. Se aparecer escrito, veio
	 * de uma versão que não existe — e lê-se como o que é.
	 */
	it('a palavra `sistema` guardada lê-se como o sistema', () => {
		expect(interpretar('sistema')).toBe('sistema');
	});
});
