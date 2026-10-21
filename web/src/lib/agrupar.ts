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
 * **Por hora:** os blocos sobem com o relógio, e dentro de cada hora os jogos ficam pela ordem
 * em que vieram — que é a ordem do escalão, porque é assim que a agenda é construída. Os jogos
 * sem hora publicada vão para o fim, num bloco próprio: pô-los no topo seria dar-lhes a hora
 * mais cedo do dia, que é uma hora inventada.
 *
 * **Por recinto:** os blocos ordenam-se pelo **primeiro jogo de cada um**, e não por ordem
 * alfabética. Quem abre esta vista a meio de uma tarde quer ver o que vem a seguir, e um dia
 * ordenado por nome de pavilhão obriga a ler tudo para o descobrir. Dentro de cada recinto, os
 * jogos vão por hora — que é exactamente o que a pessoa pediu.
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

const SEM_HORA = 'Sem hora marcada';
const SEM_RECINTO = 'Sem recinto indicado';

/**
 * Um bloco por hora de início, do mais cedo para o mais tarde.
 *
 * Os jogos sem hora ficam num bloco no fim — ver o porquê no topo do ficheiro.
 */
export function agruparPorHora(jogos: readonly JogoAgenda[]): BlocoSimples[] {
	const m = new Map<string, JogoAgenda[]>();
	for (const j of jogos) {
		const k = hhmm(j.hora) || SEM_HORA;
		(m.get(k) ?? m.set(k, []).get(k)!).push(j);
	}
	return [...m]
		.sort(([a], [b]) => {
			if (a === SEM_HORA) return 1;
			if (b === SEM_HORA) return -1;
			return a.localeCompare(b);
		})
		.map(([k, js]) => ({ chave: k, titulo: k, jogos: js }));
}

/**
 * Um bloco por recinto, ordenado pelo primeiro jogo de cada um; lá dentro, por hora.
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
	const comHoras = [...m].map(([k, js]) => {
		const ordenados = [...js].sort((a, b) => hhmm(a.hora).localeCompare(hhmm(b.hora)));
		return { chave: k, titulo: k, jogos: ordenados, primeira: hhmm(ordenados[0]?.hora) };
	});
	return comHoras
		.sort((a, b) => {
			if (a.chave === SEM_RECINTO) return 1;
			if (b.chave === SEM_RECINTO) return -1;
			// sem hora conhecida, o recinto desce — senão subia ao topo por comparar com ''
			const ha = a.primeira || '99:99';
			const hb = b.primeira || '99:99';
			return ha.localeCompare(hb) || a.titulo.localeCompare(b.titulo, 'pt');
		})
		.map(({ chave, titulo, jogos }) => ({ chave, titulo, jogos }));
}

/** O agrupamento pedido, para os dois modos planos. O `escalao` vive no `PaginaDia.svelte`. */
export function agrupar(jogos: readonly JogoAgenda[], modo: Agrupamento): BlocoSimples[] {
	return modo === 'local' ? agruparPorLocal(jogos) : agruparPorHora(jogos);
}
