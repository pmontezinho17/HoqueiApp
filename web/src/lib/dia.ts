/**
 * "Hoje", em Lisboa. **Nunca em UTC.**
 *
 * ## Porque é que isto é um módulo e não um `new Date().toISOString().slice(0, 10)`
 *
 * Porque era isso, em sete ficheiros, e esteve errado uma hora por dia durante meses.
 *
 * Em hora de verão Portugal está em UTC+1, por isso entre as 00:00 e as 00:59 de Lisboa o
 * `toISOString()` ainda devolve **o dia anterior**. Resultado: a app abria em ontem — a fita de
 * datas marcava o dia errado, o "próximo jogo" olhava para a janela errada, e um jogo de ontem
 * ainda por fechar aparecia como sendo de hoje.
 *
 * Apanhado às 00:48 de sábado, 17/10/2026, pelo dono: *"hoje é sábado e parece que ainda está
 * na sexta"*. Medido no mesmo minuto:
 *
 *     new Date().toISOString().slice(0, 10)  →  2026-10-16
 *     data de Lisboa                         →  2026-10-17
 *
 * O review externo de 13/10 já tinha apontado os sete ficheiros (R3 no backlog). Eu escrevi na
 * altura que o defeito *"adormece a 25/10"*, quando Portugal volta a UTC+0 — é verdade, e foi
 * por isso que o pus atrás de outras coisas. O que isso escondia é que **até lá está acordado
 * todas as noites**, e foi numa dessas que ele deu por ele.
 *
 * ## Porquê `sv-SE`
 *
 * Porque devolve `2026-10-17` — ISO, sem ter de montar a data campo a campo, e sem o truque
 * frágil de somar o desvio do fuso à mão. É o mesmo que o `presenca.ts` e o Worker do relógio já
 * usavam; o que faltava era haver **um** sítio.
 */

/** A data de hoje em Lisboa, `AAAA-MM-DD`. */
export const diaDeLisboa = (quando: Date = new Date()): string =>
	quando.toLocaleDateString('sv-SE', { timeZone: 'Europe/Lisbon' });

/**
 * A data de Lisboa daqui a `dias` dias — negativo para trás.
 *
 * Soma-se ao instante e **só depois** se converte para a data de Lisboa, e não ao contrário:
 * somar dias a uma string de data trata todos os dias como tendo 24 horas, e duas vezes por ano
 * há um que não tem.
 */
export const diaDeLisboaMais = (dias: number, quando: Date = new Date()): string =>
	diaDeLisboa(new Date(quando.getTime() + dias * 864e5));

/**
 * Que dia abrir na lista de jogos: o que vem no endereço, ou o mais próximo de hoje.
 *
 * ## O defeito que isto fecha
 *
 * Reportado pelo dono a 21/10/2026: *"entrei dentro dos detalhes de um jogo que vai acontecer no
 * dia 31 de outubro, e quando carrego na seta para voltar atrás, volto para o dia de hoje"*.
 *
 * **Medido no browser, com um ouvinte no `popstate`**, e o resultado aponta o culpado sem
 * margem:
 *
 *     popstate                ?dia=2026-10-31   ← o browser restaurou o endereço certo
 *     400 ms depois do back   ?dia=2026-10-21   ← a app reescreveu-o
 *
 * A escolha do dia inicial lia o `page.url` do SvelteKit, que **ainda não estava actualizado**
 * no instante em que o efeito corre ao voltar. Sem `?dia=` à vista, caía no ramo "o dia com
 * jogos mais próximo de hoje" — e o efeito que mantém o endereço a par gravava esse engano por
 * cima do endereço bom. O `+page.svelte` já tinha um aviso sobre o router não estar pronto na
 * primeira renderização; era a mesma classe de problema noutro sítio.
 *
 * A correcção é ler o `location.search`, que no `popstate` já está certo — é por isso que o
 * ouvinte o viu certo. Esta função fica com a **escolha**, que é o que se pode testar sem
 * browser; de onde vem o `pedido` é o que o comentário acima guarda.
 *
 * @param pedido o `?dia=` tal como vem do endereço, ou `null`
 * @param dias os dias com jogos dentro da janela da fita, por ordem
 * @param hoje o dia de hoje em Lisboa
 */
export function diaInicial(
	pedido: string | null | undefined,
	dias: readonly string[],
	hoje: string
): string {
	if (pedido && dias.includes(pedido)) return pedido;
	return dias.find((d) => d >= hoje) ?? dias.at(-1) ?? '';
}
