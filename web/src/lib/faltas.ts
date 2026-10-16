/**
 * As faltas de equipa no placar: quando se mostram, e quando passam a aviso.
 *
 * ## Porque é que isto existe
 *
 * Pedido do dono a 10/10/2026, por email, e aprovado a 17/10: *"quando uma equipa acumula 10
 * faltas é convertido num livre direto contra ela. Portanto na parte superior perto dos golos,
 * temos de ter o número total de faltas de cada equipa. E quando ficar nas 9 faltas deve ser
 * colocado um background por trás desse número, como se fosse um alerta"*.
 *
 * ## O que se mediu antes de desenhar
 *
 * **As faltas já vinham nos dados, e são ao vivo.** Saem do `div.box_faltas` do cabeçalho da
 * ficha — o mesmo bloco de onde vêm o resultado e a situação —, e a ronda ao vivo regrava a
 * ficha inteira de 30 em 30 segundos. Custo em pedidos à APL desta funcionalidade: **zero**.
 *
 * **E o número é do jogo inteiro, não da parte.** Medido nas 337 fichas publicadas: em 332
 * delas o total do cabeçalho é exactamente a soma das duas partes do boletim. É por isso que
 * este contador conta o jogo — é o que a fonte conta, e é o número que o marcador do pavilhão
 * mostra.
 *
 * **Chegar às 9 é raro, e é isso que faz do aviso um aviso.** Na mesma amostra, de 1 348 partes
 * só **uma** chegou às 10, e oito chegaram às 9. Um aviso que aparecesse em metade dos jogos não
 * serviria para nada.
 *
 * ## O que falta confirmar com o dono, e porque é que o ecrã não o afirma
 *
 * Ele escreveu "livre direto" a 10/10 e "penalti" a 17/10, e o regulamento que temos em
 * `docs/09-regulamento-apl.md` cobre o Artigo 92.º e não as faltas de equipa. Enquanto isso não
 * estiver confirmado, **o ecrã não nomeia a sanção**: diz o número e avisa, sem dizer o que
 * acontece à décima. Numa app cuja credibilidade depende de acertar nas regras, é melhor não
 * dizer do que dizer mal.
 */

/** A partir daqui o número ganha fundo: falta uma para a sanção. */
export const FALTAS_DE_ALERTA = 9;

/** A partir daqui a sanção já se aplica em cada falta seguinte. */
export const FALTAS_COM_SANCAO = 10;

export type EstadoDasFaltas = 'normal' | 'alerta' | 'atingido';

/**
 * Em que estado está o contador de uma equipa.
 *
 * `null` e valores negativos contam como `normal`: uma ficha sem faltas publicadas não é um
 * jogo sem faltas, é um jogo sobre o qual não sabemos — e inventar um aviso a partir de um
 * campo em falta seria pior do que não o mostrar.
 */
export function estadoDasFaltas(n: number | null | undefined): EstadoDasFaltas {
	if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) return 'normal';
	if (n >= FALTAS_COM_SANCAO) return 'atingido';
	if (n >= FALTAS_DE_ALERTA) return 'alerta';
	return 'normal';
}

/**
 * Se vale a pena mostrar as faltas no placar.
 *
 * **Só com o jogo a decorrer**, por decisão do dono a 17/10/2026: *"só faz sentido se for no
 * ecrã de jogo ao vivo"*. Num jogo terminado o número continua na caixa de informação, onde já
 * estava desde 04/10 — ali é um dado da ficha, aqui é uma coisa que muda enquanto se olha.
 *
 * E só quando há números: a fonte publica `[null, null]` nos jogos por começar.
 */
export function mostrarNoPlacar(
	aDecorrer: boolean,
	faltas: readonly [number | null, number | null] | null | undefined
): boolean {
	if (!aDecorrer || !faltas) return false;
	return typeof faltas[0] === 'number' && typeof faltas[1] === 'number';
}
