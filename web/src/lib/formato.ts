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

const DIAS_LONGOS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira',
	'quinta-feira', 'sexta-feira', 'sábado'];
const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
	'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export function dataLonga(iso: string): string {
	const d = new Date(`${iso}T00:00:00`);
	return `${DIAS_LONGOS[d.getDay()]}, ${d.getDate()} de ${MESES_LONGOS[d.getMonth()]}`;
}

const PARTICULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'di', 'del', 'della',
	'van', 'von', 'der', 'du', 'la', 'le', 'y']);

/**
 * Nome de pessoa em caixa de título: `SALVADOR MONTEZINHO` → `Salvador Montezinho`.
 *
 * A fonte publica os nomes todos em maiúsculas, que num ecrã de telemóvel se lê pior e
 * ocupa mais largura. Três cuidados:
 *  - as partículas ficam em minúscula (`Vasco de Sousa`), menos se abrirem o nome;
 *  - a maiúscula volta depois de hífen e de apóstrofo (`D'Ávila`, `Vila-Chã`);
 *  - um nome que **não** venha todo em maiúsculas foi escrito por alguém com critério,
 *    e fica como está — reformatá-lo só podia estragar.
 */
export function nomeProprio(n: string | null | undefined): string {
	if (!n) return '';
	if (n !== n.toUpperCase()) return n;
	return n
		.toLowerCase()
		.split(/(\s+)/)
		.map((parte, i) =>
			/^\s*$/.test(parte) || (i > 0 && PARTICULAS.has(parte))
				? parte
				: parte.replace(/(^|[-'’])(\p{L})/gu, (_, antes, letra) => antes + letra.toUpperCase())
		)
		.join('');
}
