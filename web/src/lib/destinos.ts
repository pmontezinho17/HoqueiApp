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
 * A ficha do jogo. **Sempre, desde que a fonte lhe tenha dado um id.**
 *
 * Houve aqui, durante umas horas de 20/10/2026, a condição `jogado || tem_ficha`, com a razão
 * escrita de que "sem ficha não há nada para mostrar lá dentro". **Era falso, e desde 09/10.**
 * Nessa data a página do jogo passou a montar uma ficha a partir da agenda quando a fonte ainda
 * não publicou a sua — ver `fichaDaAgenda.ts` — e a mostrar os separadores que existem, com uma
 * nota a dizer que o onze e o boletim aparecem quando o jogo começar. Eu escrevi a condição a
 * olhar para o nome do campo e não para o que o ecrã faz.
 *
 * O dono trouxe a ideia certa: *"num dia por disputar, acho que seria interessante entrar no
 * menu de jogo, mas apresentar apenas o tab de informação"*. É o que a página já sabia fazer, e
 * é o que quem vai ao pavilhão quer na véspera — a hora e o recinto.
 *
 * Com isto, **todas as linhas da lista passam a abrir o jogo**, e nenhuma oferece um segundo
 * alvo ao dedo. A regra "um alvo por linha" fica satisfeita sem ter de escolher qual: há sempre
 * um só, e é o mesmo em toda a lista.
 */
export function destinoDoJogo(jogo: Pick<JogoAgenda, 'id'>): string | null {
	return jogo.id ? `/jogo/${jogo.id}` : null;
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
 * ## A regra que ficou: **um alvo por linha**
 *
 * Numa linha de jogo há **um** destino e só um: a ficha do jogo.
 *
 * Houve uma versão, a 20/10/2026, em que a linha tinha um link a cobri-la e as equipas
 * clicáveis por cima dele. O dono parou-a assim que a viu no site de testes:
 *
 * > neste menu, não quero que os clubes sejam clicáveis, pois cada vez que quero abrir o jogo
 * > posso sem querer carregar em cima do nome clube e abrir o clube ao invés do jogo
 *
 * E os dados dão-lhe razão. Das cinco sugestões que pediam o emblema clicável, **nenhuma foi
 * escrita na lista de jogos**: vieram de `/jogo/9377`, de `/clube` e de duas páginas de equipa.
 * Quem está na lista quer abrir o jogo — pôr-lhe um segundo alvo por cima era resolver um
 * pedido num sítio onde ele não existia e criar um problema onde não havia nenhum.
 *
 * **Onde é que o pedido fica então resolvido:** na ficha de jogo, onde o emblema abre a equipa
 * ao lado do nome que já o fazia, e onde nunca disputou alvo com nada. Da lista chega-se lá num
 * toque, e à equipa no seguinte.
 *
 * Duas coisas de borla, e as duas valem mais do que o atalho que se perdeu: um `<a>` dentro de
 * outro deixou de ser possível por construção — e com isso foram-se o link que cobria a linha,
 * o `position: relative`, os `z-index` e a regra com `:has()` — e a lista passou a comportar-se
 * **da mesma maneira em todas as linhas**, em vez de depender de a fonte já ter publicado a
 * convocatória.
 */
