/**
 * Casa ou fora, no calendário de uma equipa — por jogo e por dia.
 *
 * ## O defeito que isto fecha
 *
 * Reportado por um utilizador pela caixa "O que está mal" a 17/10/2026, no ecrã
 * `/equipa/sub-17/caco-a`: *"quando entro nos meus clubes e vou ao calendário, alguns jogos
 * que foram fora aparecem que foram em casa e vice versa"*.
 *
 * A pessoa tinha razão, e a causa estava à vista no `CalendarioMes.svelte`: o fundo escuro da
 * célula e o `F` saíam de `doDia[0]` — **o primeiro jogo do dia** — enquanto o `{#each}` logo
 * a seguir desenhava **todos**. Num dia com dois jogos, um em casa e outro fora, o segundo
 * herdava a marca do primeiro.
 *
 * ## Quantas vezes isso acontece, medido a 20/10/2026
 *
 * Nos dados publicados, desduplicados pelo `id` da fonte e **agrupados por escalão** — que é
 * como o ecrã os vê, porque o calendário recebe uma equipa de cada vez:
 *
 *     1 529 dias-equipa
 *        80 com dois ou mais jogos no mesmo dia      (5,2%)
 *        67 com casa **e** fora no mesmo dia         (4,4%)
 *
 * Sessenta e sete células erradas à espera de alguém que reparasse. E a equipa que a pessoa
 * indicou está lá: **`SUB-17 · CACO A`, 12/09/2026, um jogo em casa e um fora**.
 *
 * A primeira contagem que fiz deu 26,9% e estava errada: contava o mesmo jogo em vários
 * ficheiros e juntava escalões diferentes sob o nome do clube. Fica aqui porque o número mau
 * era quase sete vezes maior do que o verdadeiro, e porque a tentação de o publicar sem
 * desduplicar foi real.
 *
 * ## Porque é que isto é um módulo e não um `{#if}` no componente
 *
 * Nenhum teste do `web/` monta um componente — não há jsdom no projecto, e é uma escolha. Um
 * defeito que viva dentro do `{#if}` de um ecrã é invisível para a suite inteira, e foi
 * exactamente aí que este viveu. Trazer a decisão para aqui põe-na ao alcance de um teste com
 * os dados publicados verdadeiros.
 */

import type { Jogo } from './tipos';

/** Onde é que esta equipa joga este jogo. */
export type Local = 'casa' | 'fora';

/**
 * E o que é que o dia inteiro tem.
 *
 * `misto` é o caso que faltava: a célula não pode afirmar "fora" quando metade dos jogos é em
 * casa, por isso deixa de afirmar o que quer que seja e passa a palavra a cada jogo.
 */
export type LocalDoDia = Local | 'misto' | 'nenhum';

/** @param equipa o nome da equipa cujo calendário está aberto, tal como a fonte o escreve */
export function localDoJogo(jogo: Jogo, equipa: string): Local {
	return jogo.casa === equipa ? 'casa' : 'fora';
}

/**
 * O adversário, do ponto de vista desta equipa.
 *
 * Vivia no componente e vem para aqui ao lado do resto, para não ficar a decisão dividida
 * entre dois sítios.
 */
export function adversario(jogo: Jogo, equipa: string): string {
	return jogo.casa === equipa ? jogo.fora : jogo.casa;
}

/**
 * O que a célula do dia pode afirmar.
 *
 * Um dia sem jogos é `nenhum` e não `casa`: a ausência de jogo não é um jogo em casa, e pintar
 * a célula como tal era dizer uma coisa falsa de graça.
 */
export function localDoDia(jogosDoDia: readonly Jogo[], equipa: string): LocalDoDia {
	if (jogosDoDia.length === 0) return 'nenhum';
	const locais = new Set(jogosDoDia.map((j) => localDoJogo(j, equipa)));
	if (locais.size > 1) return 'misto';
	return locais.has('casa') ? 'casa' : 'fora';
}

/**
 * Se este jogo precisa de carregar a sua própria marca.
 *
 * Só num dia misto. Num dia inteiro fora, o fundo escuro da célula e o `F` já o dizem uma vez
 * — repeti-lo em cada jogo seria ruído numa célula que tem 3 rem de altura.
 */
export function jogoPrecisaDeMarca(jogosDoDia: readonly Jogo[], equipa: string, jogo: Jogo): boolean {
	return localDoDia(jogosDoDia, equipa) === 'misto' && localDoJogo(jogo, equipa) === 'fora';
}
