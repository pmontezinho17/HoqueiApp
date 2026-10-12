/**
 * A lista de transmissões — escrita à mão, e por isso com testes de disciplina e não de lógica.
 *
 * Não há aqui algoritmo nenhum para verificar: o que pode correr mal é a lista ganhar uma
 * entrada mal feita, e isso só se vê no sábado a seguir, com o jogo a decorrer e alguém a
 * olhar para um rectângulo vazio. Estes testes impedem as três formas de ela ficar mal.
 *
 * **O comportamento testa-se contra uma lista de mentira, e a disciplina contra a real.** A
 * 12/10/2026 a lista real ficou vazia — é o estado normal, ver `bandeiras.ts` — e a partir daí
 * um teste de comportamento que dependesse dela deixava de testar o que diz: passava por
 * passar vazio, e no dia em que a trava da data se partisse ninguém notava. É o mesmo erro que
 * me apanhou no teste do id da época, a 11/10.
 */
import { describe, expect, it } from 'vitest';
import { DIRECTOS, directoDe, naLista, type Directo } from './directos';

/** Uma transmissão inventada, para os testes de comportamento não depender de haver uma real. */
const FINGIDA: Record<number, Directo> = {
	9539: { data: '2026-10-10', url: 'https://exemplo.invalido/live?u=1', fonte: 'XbotGo' }
};

describe('naLista — a procura, sem olhar a onde estamos', () => {
	it('encontra o jogo que tem transmissão', () => {
		const d = naLista(9539, FINGIDA);
		expect(d?.fonte).toBe('XbotGo');
		expect(d?.url).toContain('https://');
	});

	it('um jogo sem transmissão não tem, e isso não é um erro', () => {
		expect(naLista(9540, FINGIDA)).toBeUndefined();
	});

	it('a agenda tem jogos sem id, e quem chama não deve ter de se lembrar disso', () => {
		expect(naLista(null, FINGIDA)).toBeUndefined();
		expect(naLista(undefined, FINGIDA)).toBeUndefined();
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
		expect(directoDe(9539, '2026-10-10', FINGIDA)?.fonte).toBe('XbotGo');
	});

	it('no dia seguinte desaparece sozinho', () => {
		expect(directoDe(9539, '2026-10-11', FINGIDA)).toBeUndefined();
	});

	it('e no dia anterior também não aparece', () => {
		expect(directoDe(9539, '2026-10-09', FINGIDA)).toBeUndefined();
	});

	it('um jogo que não está na lista continua a não ter', () => {
		expect(directoDe(9540, '2026-10-10', FINGIDA)).toBeUndefined();
		expect(directoDe(null, '2026-10-10', FINGIDA)).toBeUndefined();
	});
});

describe('a lista real está bem escrita', () => {
	/**
	 * **Estes percorrem a lista a sério, e com ela vazia não verificam nada — de propósito.**
	 * Vazia é o estado normal: a capacidade está em produção e só se anuncia uma transmissão
	 * nos dias em que existe uma. O que estes testes fazem é esperar pela próxima entrada e
	 * apanhá-la mal escrita antes de alguém olhar para um rectângulo vazio num sábado.
	 */
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

describe('e por omissão a lista é a real', () => {
	/**
	 * Com os parâmetros novos há uma forma de isto correr mal que não havia: a app chama
	 * `directoDe(id)` **sem** lista, e se a omissão apontasse para o sítio errado a
	 * funcionalidade deixava de existir em silêncio — nenhum ícone, nenhum separador, nenhum
	 * erro.
	 *
	 * **Põe-se uma entrada na lista real e tira-se no fim**, em vez de comparar dois
	 * `undefined`: com a lista vazia, um `expect(naLista(9539)).toBe(DIRECTOS[9539])` passa
	 * por os dois lados serem nada, e passaria igual se a omissão estivesse trocada. Foi esse
	 * o erro do meu teste do id da época a 11/10 e não se repete.
	 *
	 * E não se verifica aqui que a lista está vazia: encher a lista é o propósito desta
	 * funcionalidade, e um teste que falhasse por haver uma transmissão anunciada punha-se no
	 * caminho da coisa certa.
	 */
	it('sem lista passada, procura na DIRECTOS', () => {
		const id = -1; // um id que a fonte nunca dá, para não colidir com uma entrada real
		DIRECTOS[id] = { data: '2026-01-01', url: 'https://exemplo.invalido/', fonte: 'teste' };
		try {
			expect(naLista(id)).toBe(DIRECTOS[id]);
			expect(directoDe(id, '2026-01-01')).toBe(DIRECTOS[id]);
			expect(directoDe(id, '2026-01-02')).toBeUndefined();
		} finally {
			delete DIRECTOS[id];
		}
		expect(naLista(id)).toBeUndefined();
	});
});
