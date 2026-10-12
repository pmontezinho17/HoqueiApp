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

describe('directoDe — cada entrada vale no seu dia', () => {
	/**
	 * Esta trava substituiu a de "só em ramo" quando o dono decidiu que a capacidade podia ir
	 * a produção, com a lista a valer vazia. A lista não ficou literalmente vazia porque ele
	 * estava a ver o jogo nesse momento; em vez de a esvaziar à mão depois, e de confiar em
	 * que alguém se lembrasse, as entradas expiram sozinhas.
	 *
	 * E não é só arrumação: a sala do XbotGo é reutilizada de jogo para jogo pelo mesmo
	 * utilizador. O endereço de ontem continua a responder, **a mostrar o jogo de hoje de
	 * outra gente** — e nós anunciávamo-lo como sendo o jogo de ontem.
	 */
	it('no dia do jogo aparece', () => {
		expect(directoDe(9539, '2026-10-10')?.fonte).toBe('XbotGo');
	});

	it('no dia seguinte desaparece sozinho', () => {
		expect(directoDe(9539, '2026-10-11')).toBeUndefined();
	});

	it('e no dia anterior também não aparece', () => {
		expect(directoDe(9539, '2026-10-09')).toBeUndefined();
	});

	it('um jogo que não está na lista continua a não ter', () => {
		expect(directoDe(9540, '2026-10-10')).toBeUndefined();
		expect(directoDe(null, '2026-10-10')).toBeUndefined();
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

	it('todas têm o dia do jogo, em AAAA-MM-DD', () => {
		// sem `data` a entrada nunca apareceria, e o defeito era silencioso: um separador que
		// não existe não dá erro nenhum, e descobria-se com o jogo a decorrer
		for (const [id, d] of Object.entries(DIRECTOS))
			expect(d.data, id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});
});
