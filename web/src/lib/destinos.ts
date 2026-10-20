/**
 * Para onde é que uma linha de jogo leva — o jogo, e cada uma das equipas.
 *
 * ## Porque é que isto existe
 *
 * **É o pedido mais repetido da caixa "O que está mal".** Das 18 sugestões que chegaram por lá
 * até 18/10/2026, **cinco** pediam a mesma coisa por palavras diferentes:
 *
 * * *"só consigo entrar dentro dos detalhes de cada uma se carregar no nome da equipa. Seria
 *   mais prático se carregar também no próprio emblema"*;
 * * *"quando pressiono num símbolo da equipa (…) devia de ir para o detalhe da mesma"*;
 * * *"clicando no logotipo da equipa também devia ser um link para visitar a equipa. Temos de
 *   carregar no nome"*;
 * * *"o click na equipa para irmos directos à equipa só dá nos jogos com resultados, no que tem
 *   próximo jogo não dá"*;
 * * e uma quinta sobre a tabela de classificação, onde o link **já existia** — ver abaixo.
 *
 * ## As duas coisas diferentes que estavam lá dentro
 *
 * **A linha de jogo inteira era um link para o jogo**, e por isso tocar no emblema abria a
 * ficha do jogo em vez da equipa. Não se mete um `<a>` dentro de outro `<a>`, por isso a
 * solução não era "acrescentar um link": era a linha deixar de ser um link e passar a ter
 * um link que a cobre, com as equipas por cima dele.
 *
 * **E num jogo por disputar sem ficha publicada não havia link nenhum** — era esse o quarto
 * pedido. Continua a não haver *para o jogo*, e de propósito: sem ficha não há nada para
 * mostrar lá dentro. Mas as equipas passam a ser alcançáveis, que era o que a pessoa queria.
 *
 * ## O que isto não resolve, e porquê
 *
 * O quinto pedido — *"quando na tabela classificativa se clicar num clube ir para a página
 * desse clube"* — descreve algo que **já funcionava**: na `TabelaClassificacao.svelte` o
 * emblema e o nome estão os dois dentro de `<a href={caminhoEquipa(...)}>`. Se a pessoa pediu
 * assim mesmo, o problema não é o link faltar, é a área de toque não se dar a conhecer. Isso
 * mede-se no telemóvel e trata-se à parte; não se resolve aqui e não se finge que se resolveu.
 *
 * ## Porque é que isto é um módulo
 *
 * Nenhum teste do `web/` monta componentes. A pergunta "esta linha leva a algum lado?" vivia
 * dentro do `.svelte` e por isso **nenhum teste a podia fazer** — que é exactamente como um
 * jogo por disputar ficou quatro semanas sem saída nenhuma até um utilizador reparar.
 */

import { caminhoEquipa } from './slug';
import type { JogoAgenda } from './tipos';

/**
 * A ficha do jogo, ou `null` quando ainda não há nada lá dentro.
 *
 * Um jogo por disputar passa a ter ficha dias antes, quando a fonte publica a convocatória, e
 * é isso que se quer ver na véspera. Antes disso, abrir levaria a um ecrã vazio.
 */
export function destinoDoJogo(jogo: Pick<JogoAgenda, 'id' | 'gc' | 'gf'> & { tem_ficha?: boolean }): string | null {
	const jogado = jogo.gc !== null && jogo.gf !== null;
	return jogo.id && (jogado || jogo.tem_ficha) ? `/jogo/${jogo.id}` : null;
}

/**
 * A página de uma equipa, ou `null` se não soubermos o escalão.
 *
 * O escalão faz parte da identidade: há um `CACO A` nos sub-13 e outro nos sub-17, e são
 * equipas diferentes. Sem ele não há endereço que se possa construir — e inventar um levaria
 * a pessoa a um 404, que é pior do que não ter link.
 */
export function destinoDaEquipa(equipa: string, categoria: string | null | undefined): string | null {
	if (!equipa || !categoria) return null;
	return caminhoEquipa(equipa, categoria);
}
