import { describe, expect, it } from 'vitest';
import { PASSOS, caminhoDe, primeiroComAlvo, type Passo } from './guia.svelte';

/**
 * A promessa deste tour é que uma mudança de desenho lhe custa um passo, e não um holofote
 * aceso em cima de nada. Esta é a regra que a cumpre, e é por isso que vive fora do
 * componente: assim pode ser testada sem montar um DOM nem um router.
 */
describe('o tour salta os passos que não se aplicam', () => {
	const todos = () => true;
	const nenhum = () => false;

	/**
	 * Os predicados são por **índice** e não por alvo.
	 *
	 * Desde que os passos passaram a conduzir as abas da página de equipa, quatro deles
	 * partilham o alvo `equipa-abas` e distinguem-se pelos parâmetros do endereço. Um teste
	 * que escolhesse o passo pelo alvo passava a apanhar o primeiro dos quatro — e foi
	 * exactamente isso que ele fez quando a lista mudou.
	 */
	const so = (i: number) => (p: Passo) => PASSOS.indexOf(p) === i;

	it('fica no passo pedido quando ele se aplica', () => {
		expect(primeiroComAlvo(0, todos)).toBe(0);
		expect(primeiroComAlvo(3, todos)).toBe(3);
	});

	it('salta para o primeiro que se aplique', () => {
		expect(primeiroComAlvo(0, so(4))).toBe(4);
	});

	it('devolve nulo quando já não há nenhum à frente — e aí o tour acaba', () => {
		expect(primeiroComAlvo(0, nenhum)).toBe(null);
		expect(primeiroComAlvo(1, so(0))).toBe(null);
	});

	it('um índice fora da lista não estoura', () => {
		expect(primeiroComAlvo(999, todos)).toBe(null);
		expect(primeiroComAlvo(-5, todos)).toBe(0);
	});

	it('o passo do botão de opinião desaparece quando o botão sair do ar', () => {
		// o `RECOLHER_FEEDBACK` deixa de montar a bolha, e a regra do salto trata do resto
		const i = PASSOS.findIndex((p) => p.alvo === 'feedback');
		expect(i).toBe(PASSOS.length - 1);
		expect(primeiroComAlvo(i, (p) => p.alvo !== 'feedback')).toBe(null);
	});
});

/**
 * Os passos vivem em ecrãs diferentes desde 06/10/2026, e o caminho de um deles depende de
 * quem a pessoa segue. Um caminho que resolva a `null` é um passo que não se aplica àquela
 * pessoa — e é a diferença entre saltar um passo e mandar o tour para uma página que não
 * existe.
 */
describe('o ecrã de cada passo', () => {
	it('sem caminho declarado, o passo vive na lista de jogos', () => {
		expect(caminhoDe({ alvo: 'x', titulo: 't', texto: 'u' })).toBe('/');
	});

	it('um caminho fixo devolve-se como está', () => {
		expect(caminhoDe({ alvo: 'x', titulo: 't', texto: 'u', caminho: '/clube' })).toBe('/clube');
	});

	it('um caminho calculado é resolvido', () => {
		const p: Passo = { alvo: 'x', titulo: 't', texto: 'u', caminho: () => '/equipa/sub-13/parede-fc-a' };
		expect(caminhoDe(p)).toBe('/equipa/sub-13/parede-fc-a');
	});

	it('um caminho que resolve a nulo marca o passo como não aplicável', () => {
		const p: Passo = { alvo: 'x', titulo: 't', texto: 'u', caminho: () => null };
		expect(caminhoDe(p)).toBe(null);
	});

	it('todos os passos declarados resolvem para um caminho ou para nulo', () => {
		for (const p of PASSOS) {
			const c = caminhoDe(p);
			expect(c === null || c.startsWith('/')).toBe(true);
		}
	});
});
