/**
 * Como é que os jogos de um dia se agrupam: por escalão, por hora, ou por recinto.
 *
 * ## O pedido
 *
 * Sugestão da caixa "O que está mal", escrita a 17/10/2026 no ecrã dos jogos do dia, e que o
 * dono mandou avançar a 21/10 — é o item **S12** do backlog:
 *
 * > No ecrã de jogos do dia, ter a possibilidade de visualizar os jogos agrupados por: hora de
 * > jogo, escalões, clube (seria interessante ver todos os jogos que vão acontecer no clube
 * > durante o respetivo dia ordenados por hora)
 *
 * **"No clube" é o recinto, não as equipas do clube.** A pessoa escreveu "que vão acontecer *no*
 * clube", e o que ela quer é o pavilhão: quem vai passar a tarde num pavilhão quer saber o que
 * lá se joga a seguir. O agrupamento é por `recinto`, que é o campo que a fonte publica.
 *
 * ## O que já existia
 *
 * O agrupamento por escalão — escalão → prova → série — vive no `PaginaDia.svelte` e fica lá:
 * é uma árvore de três níveis, e achatá-la para caber aqui perdia a informação. Este módulo
 * trata dos dois agrupamentos **planos** que o pedido acrescenta.
 *
 * ## As escolhas de ordenação, e porquê
 *
 * **Por hora não é um agrupamento, é uma ordenação.** Esta vista começou por ser uma caixa por
 * hora de início, e o dono parou-a a 21/10/2026, assim que a viu: *"se for escolhido o agrupar
 * por Hora, acho que podemos ter apenas uma caixa com todos os jogos, pois senão acaba por ser
 * muito repetitivo a informação que vemos — por exemplo, a caixa das 10h tem um jogo que começa
 * às 10h, depois a caixa das 11h tens um jogo que começa às 11"*. Tinha razão, e os dados
 * dizem-no: medido nessa data na agenda publicada, nos 56 dias com jogos a mediana é de **1,33
 * jogos por hora de início**, e em **24 desses dias** a razão é exactamente 1 — ou seja, cada
 * caixa teria um jogo lá dentro. Uma caixa por jogo é moldura a mais à volta de informação a
 * menos, e a hora já vai escrita em cada linha. Fica uma caixa só, por ordem de relógio.
 *
 * **Por recinto:** por ordem **alfabética**, e os jogos de cada um por hora. A primeira versão
 * ordenava os recintos pelo primeiro jogo de cada um — a pensar em quem chega a meio da tarde e
 * quer ver o que vem a seguir — e o dono corrigiu-a no mesmo dia: numa lista de pavilhões o que
 * se faz é **procurar um**, e para procurar precisa-se de ordem alfabética. A outra leitura já
 * está servida pela vista por hora, que é a seguir ao lado.
 *
 * Em qualquer das duas, o que a fonte não publicou vai para o fim: um jogo sem hora não se põe
 * no topo do dia, e um jogo sem recinto não ganha um pavilhão inventado.
 */

import type { JogoAgenda } from './tipos';

export type Agrupamento = 'escalao' | 'hora' | 'local';

export const AGRUPAMENTOS: { id: Agrupamento; rotulo: string }[] = [
	{ id: 'escalao', rotulo: 'Escalão' },
	{ id: 'hora', rotulo: 'Hora' },
	{ id: 'local', rotulo: 'Local' }
];

export interface BlocoSimples {
	/** estável, para a chave do `{#each}` */
	chave: string;
	titulo: string;
	jogos: JogoAgenda[];
}

/** `"15:00:00"` → `"15:00"`, e vazio quando a fonte não publicou hora. */
const hhmm = (h: string | null | undefined) => (h ?? '').trim().slice(0, 5);

const SEM_RECINTO = 'Sem recinto indicado';

/**
 * Todos os jogos do dia por ordem de relógio, numa lista só.
 *
 * Não devolve blocos de propósito — ver o porquê no topo. Os jogos sem hora publicada vão para
 * o fim.
 */
export function ordenarPorHora(jogos: readonly JogoAgenda[]): JogoAgenda[] {
	return [...jogos].sort((a, b) => {
		const ha = hhmm(a.hora);
		const hb = hhmm(b.hora);
		// sem hora cai para o fim, e não para o topo por comparar com ''
		return (ha || '99:99').localeCompare(hb || '99:99');
	});
}

/**
 * Um bloco por recinto, por ordem alfabética; lá dentro, os jogos por hora.
 *
 * Os jogos sem recinto ficam num bloco no fim, pela mesma razão dos sem hora: inventar-lhes um
 * pavilhão seria pior do que dizer que não se sabe.
 */
export function agruparPorLocal(jogos: readonly JogoAgenda[]): BlocoSimples[] {
	const m = new Map<string, JogoAgenda[]>();
	for (const j of jogos) {
		const k = (j.recinto ?? '').trim() || SEM_RECINTO;
		(m.get(k) ?? m.set(k, []).get(k)!).push(j);
	}
	return [...m]
		.map(([k, js]) => ({ chave: k, titulo: k, jogos: ordenarPorHora(js) }))
		.sort((a, b) => {
			if (a.chave === SEM_RECINTO) return 1;
			if (b.chave === SEM_RECINTO) return -1;
			// alfabética, por decisão do dono a 21/10/2026: numa lista de pavilhões procura-se um
			return a.titulo.localeCompare(b.titulo, 'pt');
		});
}
