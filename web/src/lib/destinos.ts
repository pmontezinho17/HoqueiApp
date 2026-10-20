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

/**
 * As saídas de uma linha de jogo, com a regra toda num sítio só.
 *
 * ## A regra: **um alvo por linha**
 *
 * Ou a linha abre o jogo, ou as equipas são alcançáveis. **Nunca as duas coisas.**
 *
 * A primeira versão disto, de 20/10/2026, dava as duas: a linha tinha um link a cobri-la e as
 * equipas por cima dele. O dono parou-a assim que a viu no site de testes:
 *
 * > neste menu, não quero que os clubes sejam clicáveis, pois cada vez que quero abrir o jogo
 * > posso sem querer carregar em cima do nome clube e abrir o clube ao invés do jogo
 *
 * E os dados dão-lhe razão. Das cinco sugestões que pediam o emblema clicável, **nenhuma foi
 * escrita na lista de jogos**: vieram de `/jogo/9377`, de `/clube` e de duas páginas de equipa.
 * Quem está na lista quer abrir o jogo — pôr-lhe um segundo alvo por cima era resolver um
 * pedido num sítio onde ele não existia e criar um problema onde não havia nenhum.
 *
 * O que se perde: numa linha com ficha, chegar à equipa leva dois toques em vez de um — abre-se
 * o jogo e, lá dentro, o emblema. O que se ganha: nunca um toque faz a coisa errada. Entre um
 * atalho e um engano, escolhe-se o engano que não acontece.
 *
 * E ganha-se uma coisa de borla: com a regra, um `<a>` dentro de outro `<a>` deixa de ser
 * possível por construção. A linha volta a ser um link inteiro quando abre o jogo, e todo o
 * andaime que existia para contornar o aninhamento — o link que a cobria, os `z-index` — foi
 * embora.
 */
export function saidasDaLinha(
	jogo: Pick<JogoAgenda, 'id' | 'gc' | 'gf' | 'casa' | 'fora' | 'cat'> & { tem_ficha?: boolean }
): { jogo: string | null; casa: string | null; fora: string | null } {
	const ficha = destinoDoJogo(jogo);
	if (ficha) return { jogo: ficha, casa: null, fora: null };
	return {
		jogo: null,
		casa: destinoDaEquipa(jogo.casa, jogo.cat),
		fora: destinoDaEquipa(jogo.fora, jogo.cat)
	};
}
