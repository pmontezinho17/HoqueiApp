/**
 * A lista de transmissões — escrita à mão, e por isso com testes de disciplina e não de lógica.
 *
 * Não há aqui algoritmo nenhum para verificar: o que pode correr mal é a lista ganhar uma
 * entrada mal feita, e isso só se vê no sábado a seguir, com o jogo a decorrer e alguém a
 * olhar para um rectângulo vazio. Estes testes impedem as três formas de ela ficar mal.
 */
import { describe, expect, it } from 'vitest';
import { DIRECTOS, directoDe } from './directos';

describe('directoDe', () => {
	it('encontra o jogo que tem transmissão', () => {
		const d = directoDe(9539);
		expect(d?.fonte).toBe('XbotGo');
		expect(d?.url).toContain('cloud.xbotgo.net');
	});

	it('um jogo sem transmissão não tem, e isso não é um erro', () => {
		expect(directoDe(9540)).toBeUndefined();
	});

	it('a agenda tem jogos sem id, e quem chama não deve ter de se lembrar disso', () => {
		expect(directoDe(null)).toBeUndefined();
		expect(directoDe(undefined)).toBeUndefined();
	});
});

describe('a lista está bem escrita', () => {
	it('todos os endereços são https e absolutos', () => {
		// um `http://` num site em https é bloqueado pelo browser e o separador fica vazio
		for (const [id, d] of Object.entries(DIRECTOS))
			expect(new URL(d.url).protocol, id).toBe('https:');
	});

	it('todos dizem de quem é a transmissão', () => {
		// a `fonte` não é metadado interno: vai escrita no ecrã e no botão de abrir fora
		for (const [id, d] of Object.entries(DIRECTOS)) expect(d.fonte.trim(), id).not.toBe('');
	});

	it('as chaves são ids de jogo, e não nomes de equipa', () => {
		for (const id of Object.keys(DIRECTOS)) expect(id).toMatch(/^\d+$/);
	});
});
