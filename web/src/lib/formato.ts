import { disputado, type Jogo } from './tipos';

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function dataCurta(iso: string | null): string {
	if (!iso) return '';
	const d = new Date(`${iso}T00:00:00`);
	return `${DIAS[d.getDay()]}, ${d.getDate()} ${MESES[d.getMonth()]}`;
}

export const horaCurta = (h: string | null): string => (h ? h.slice(0, 5) : '');

/**
 * A jornada em curso: a primeira, pela ordem da prova, que ainda tem jogos por disputar.
 *
 * Tentei primeiro "a jornada do próximo jogo por data" e dá a resposta errada: nesta prova
 * a 3ª jornada tem um jogo a 22/09 e a 1ª ainda tem um a 23/09, por isso saltava para a 3ª
 * com a 1ª por fechar. O que o utilizador quer saber é onde vai a prova, não qual é o
 * próximo jogo do calendário.
 */
export function jornadaAtual(jogos: Jogo[]): string | null {
	const ordem: string[] = [];
	const porJogar = new Set<string>();
	for (const j of jogos) {
		if (!ordem.includes(j.jornada)) ordem.push(j.jornada);
		if (!disputado(j)) porJogar.add(j.jornada);
	}
	return ordem.find((j) => porJogar.has(j)) ?? ordem.at(-1) ?? null;
}

/** Dentro da jornada a fonte ordena por número de jogo, não por quando se joga. */
export function porQuando(jogos: Jogo[]): Jogo[] {
	return [...jogos].sort((a, b) =>
		`${a.data ?? "9999"}${a.hora ?? ""}`.localeCompare(`${b.data ?? "9999"}${b.hora ?? ""}`)
	);
}
