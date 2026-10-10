/**
 * A lista de transmissões — escrita à mão, e por isso com testes de disciplina e não de lógica.
 *
 * Não há aqui algoritmo nenhum para verificar: o que pode correr mal é a lista ganhar uma
 * entrada mal feita, e isso só se vê no sábado a seguir, com o jogo a decorrer e alguém a
 * olhar para um rectângulo vazio. Estes testes impedem as três formas de ela ficar mal.
 */
import { describe, expect, it } from 'vitest';
import { DIRECTOS, directoDe, naLista } from './directos';

describe('naLista — a procura, sem olhar a onde estamos', () => {
	it('encontra o jogo que tem transmissão', () => {
		const d = naLista(9539);
		expect(d?.fonte).toBe('XbotGo');
		expect(d?.url).toContain('cloud.xbotgo.net');
	});

	it('um jogo sem transmissão não tem, e isso não é um erro', () => {
		expect(naLista(9540)).toBeUndefined();
	});

	it('a agenda tem jogos sem id, e quem chama não deve ter de se lembrar disso', () => {
		expect(naLista(null)).toBeUndefined();
		expect(naLista(undefined)).toBeUndefined();
	});
});

describe('directoDe — a trava que mantém isto fora de produção', () => {
	/**
	 * O dono pediu a experiência **só no site de testes**. A alternativa a esta trava era
	 * confiar em que alguém se lembrasse, no dia em que o ramo de testes fosse para
	 * produção, de que havia uma transmissão de outra gente lá dentro. Esse dia chega sem
	 * ninguém se lembrar.
	 */
	const comAnfitriao = (h: string | undefined) => {
		const antes = (globalThis as { location?: unknown }).location;
		if (h === undefined) delete (globalThis as { location?: unknown }).location;
		else (globalThis as { location?: unknown }).location = { hostname: h };
		try {
			return directoDe(9539);
		} finally {
			if (antes === undefined) delete (globalThis as { location?: unknown }).location;
			else (globalThis as { location?: unknown }).location = antes;
		}
	};

	it('num site de ramo aparece', () => {
		expect(comAnfitriao('testes.hoquei.pages.dev')?.fonte).toBe('XbotGo');
	});

	it('EM PRODUÇÃO NÃO APARECE', () => {
		expect(comAnfitriao('hoquei.pages.dev')).toBeUndefined();
	});

	it('e na pré-construção das páginas também não — é lá que nasce o HTML publicado', () => {
		expect(comAnfitriao(undefined)).toBeUndefined();
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
