/**
 * O que o placar da ficha de jogo diz por baixo do resultado.
 *
 * ## Porque é que isto mudou
 *
 * O dono enumerou a 21/10/2026 o que o placar deve ter: escalão, resultado, **parte do jogo** e
 * faltas. Sobre a parte: *"'Por começar' quando o jogo ainda não começou; 'Final' quando o jogo
 * já terminou; 'X parte' quando um jogo está em curso, deverá indicar qual a parte do jogo que
 * está a ser disputada"*.
 *
 * As duas primeiras já lá estavam. A terceira **não**: num jogo a decorrer o placar mostrava o
 * `relogio` — o minuto do jogo —, e o `periodo` ficava escondido atrás dele. Quem olhava via
 * `12:34` e não sabia se aquilo era a primeira ou a segunda parte.
 *
 * Confirmado no *parser* (`parsers/jogo.py`, onde a situação da fonte é partida em dois): o
 * `periodo` é literalmente `"1ª Parte"` ou `"2ª Parte"`, e o `relogio` é `"12:34"` à parte.
 * Quando não há relógio — `"Intervalo"`, `"Prolongamento"` — o período fica com o texto todo.
 *
 * ## O relógio não se deita fora
 *
 * Ele não pediu o minuto, mas o minuto já lá estava e é informação de quem está a decidir se
 * vale a pena ligar a transmissão. Os dois cabem: **`2ª Parte · 12:34`**. Tirar o relógio para
 * pôr a parte seria trocar um problema por outro.
 */

export interface SituacaoDoJogo {
	aDecorrer: boolean;
	porComecar: boolean;
	periodo?: string | null;
	relogio?: string | null;
	situacao?: string | null;
}

/**
 * Uma linha curta: `Por começar`, `Final`, `2ª Parte`, `2ª Parte · 12:34`, `Intervalo`.
 *
 * **Nunca devolve vazio.** Um placar sem estado nenhum é pior do que um placar que diz "Ao
 * vivo" sem detalhe: a ausência lê-se como avaria, e a fonte às vezes não publica a situação de
 * um jogo que está mesmo a decorrer.
 */
export function estadoDoPlacar(j: SituacaoDoJogo): string {
	if (!j.aDecorrer) return j.porComecar ? 'Por começar' : 'Final';

	const parte = (j.periodo ?? j.situacao ?? '').trim();
	const relogio = (j.relogio ?? '').trim();
	if (parte && relogio) return `${parte} · ${relogio}`;
	return parte || relogio || 'Ao vivo';
}
