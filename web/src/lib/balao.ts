/**
 * **Quando é que o balão de opinião se encosta à margem.** Sugestão `S11`.
 *
 * Um utilizador a 17/10/2026: o balão ficava em cima de resultados e não os deixava ler. E
 * propôs ele próprio a forma — o balão escondido no lado direito, a espreitar, e visível por
 * inteiro quando se precisa dele.
 *
 * A primeira ideia que levei ao dono foi outra: esconder o balão enquanto se rola e mostrá-lo
 * quando se pára. **Não resolvia a queixa**: parado é precisamente quando se lê, e o balão
 * voltava a tapar o resultado que estava por baixo dele. Por isso ficou a do utilizador, sem
 * o segundo toque que ela pedia: quem já rolou está a ler a lista, e o balão encosta-se à
 * margem com uma ponta à vista; tocar na ponta abre logo a caixa. No topo da página fica
 * inteiro, que é onde quem chega pela primeira vez o vê.
 *
 * Sem relógios de propósito: uma função de onde se está e não de quando se rolou não pisca, não
 * tem estados a meio, e testa-se sem fingir o tempo.
 */
export const LIMIAR_DO_BALAO = 80;

export function balaoEncostado(scrollY: number, limiar = LIMIAR_DO_BALAO): boolean {
	return scrollY > limiar;
}
