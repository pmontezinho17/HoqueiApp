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
 * ## A sanção é um livre directo, e isso foi preciso perguntar
 *
 * O dono escreveu "livre direto" a 10/10 e "penalti" a 17/10, e o ecrã não nomeou nenhuma das
 * duas enquanto a dúvida durou — numa app cuja credibilidade depende de acertar nas regras, é
 * melhor não dizer do que dizer mal. A 17/10 ele trouxe o regulamento e corrigiu-se a si
 * próprio: **é livre directo**, e o penálti não depende da contagem de faltas mas da gravidade
 * ou do local da infracção.
 */

/** A primeira falta que vale livre directo. */
export const PRIMEIRA_SANCAO = 10;

/** E a partir daí, uma a cada cinco: 15.ª, 20.ª, 25.ª… */
export const CICLO = 5;

export type EstadoDasFaltas = 'normal' | 'alerta' | 'atingido';

/**
 * Em que estado está o contador de uma equipa.
 *
 * ## A regra, tal como o dono a deu a 17/10/2026
 *
 * *"À 10.ª falta colectiva (e a cada múltiplo de 5 seguinte: 15.ª, 20.ª, etc.) é assinalado um
 * livre directo contra a equipa infractora."* E, sobre o intervalo: *"o contador não para nem
 * recomeça do zero (…) no início da segunda parte retoma a contagem a partir do valor com que
 * terminou a primeira"*.
 *
 * Essa segunda metade confirma, de fora, a medição que já se tinha feito nos dados publicados:
 * em 332 das 337 fichas o total do cabeçalho é a soma exacta das duas partes do boletim.
 *
 * ## O que a regra faz ao aviso
 *
 * O aviso **não** é "a partir das 9 fica aceso até ao fim" — isso seria ruído permanente a meio
 * do jogo numa equipa indisciplinada, e um aviso que está sempre aceso deixa de ser um aviso.
 * É um ciclo de cinco:
 *
 *     alerta     9, 14, 19, 24…   a próxima falta é livre directo
 *     atingido  10, 15, 20, 25…   esta foi
 *
 * Entre uma coisa e outra o número volta ao normal, porque entre a 11.ª e a 13.ª não há nada a
 * avisar: a sanção seguinte está a três faltas de distância.
 *
 * `null` e valores negativos contam como `normal`: uma ficha sem faltas publicadas não é um jogo
 * sem faltas, é um jogo sobre o qual não sabemos — e inventar um aviso a partir de um campo em
 * falta seria pior do que não o mostrar.
 */
export function estadoDasFaltas(n: number | null | undefined): EstadoDasFaltas {
	if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) return 'normal';
	if (n >= PRIMEIRA_SANCAO && (n - PRIMEIRA_SANCAO) % CICLO === 0) return 'atingido';
	if (n >= PRIMEIRA_SANCAO - 1 && (n - (PRIMEIRA_SANCAO - 1)) % CICLO === 0) return 'alerta';
	return 'normal';
}

/**
 * Se vale a pena mostrar as faltas no placar.
 *
 * ## A regra mudou, e as duas versões são decisões do dono
 *
 * A 17/10/2026 era **só com o jogo a decorrer**: *"só faz sentido se for no ecrã de jogo ao
 * vivo"*. A 21/10/2026 ele alargou-a, ao enumerar o que o placar deve ter: *"num jogo que ainda
 * não começou não é colocado nada, mas num jogo a decorrer ou finalizado devem aparecer as
 * faltas cometidas por cada equipa"*.
 *
 * Ou seja, o critério deixou de ser "está a decorrer" e passou a ser **"já começou"**. Num jogo
 * terminado o número já estava na caixa de informação desde 04/10; agora está também no placar,
 * ao pé do resultado, que é onde se olha primeiro.
 *
 * **Num jogo por começar continua a não aparecer nada** — e não é só porque ele o pediu: a fonte
 * publica `[null, null]` nesses jogos, e um `0 – 0` de faltas antes do apito seria um número
 * inventado a partir de um campo vazio.
 */
export function mostrarNoPlacar(
	jogoComecou: boolean,
	faltas: readonly [number | null, number | null] | null | undefined
): boolean {
	if (!jogoComecou || !faltas) return false;
	return typeof faltas[0] === 'number' && typeof faltas[1] === 'number';
}
