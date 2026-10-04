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


/** Quantas horas depois do apontamento ainda se acredita numa marca de "ao vivo". */
const JANELA_AO_VIVO_MS = 3 * 60 * 60 * 1000;

/**
 * O jogo está a decorrer **agora**.
 *
 * Duas condições, e a segunda é a que importa: a marca `ao_vivo` vem dos dados, posta pela
 * ronda que acompanha os jogos. Se essa ronda parar a meio — e vai parar, porque corre em
 * máquinas que falham —, a marca fica acesa no ficheiro para sempre. A janela de horas faz
 * com que expire sozinha, e um "ao vivo" errado num jogo de ontem é pior do que não ter
 * marca nenhuma.
 */
export function emCurso(jogo: { ao_vivo?: boolean; data: string; hora: string | null }): boolean {
	if (!jogo.ao_vivo || !jogo.hora) return false;
	const inicio = new Date(`${jogo.data}T${jogo.hora.slice(0, 5)}:00`).getTime();
	const agora = Date.now();
	return agora >= inicio && agora - inicio < JANELA_AO_VIVO_MS;
}


/** algarismos romanos usados nos níveis e nas fases: `NIVEL II`, `FASE III` */
const ROMANOS = /^(?:i{1,3}|iv|vi{0,3}|ix|xi{0,2})$/i;

/**
 * O nome de uma prova, legível.
 *
 * A fonte publica tudo em maiúsculas — `CAMP. REG. SUB-15 - 1ª FASE` — e em maiúsculas
 * todas as letras têm a mesma altura, sem hastes nem caudas. O resultado é um bloco sólido
 * que pesa mais do que os nomes das equipas que estão por baixo, por mais pequeno que se
 * ponha. Foi isso que ficou a saltar à vista depois de arrumar os tamanhos: o problema não
 * era o tamanho, era a caixa.
 *
 * `nomeProprio` faz o trabalho todo menos uma coisa: trata `II` como palavra e devolve
 * `Ii`. Os algarismos romanos voltam a subir aqui.
 */
export function nomeProva(nome: string | null | undefined): string {
	if (!nome) return '';
	return nomeProprio(nome)
		.split(' ')
		.map((p) => (ROMANOS.test(p) ? p.toUpperCase() : p))
		.join(' ');
}

/**
 * A fase do jogo em duas ou três letras, para a coluna de 3.1rem da linha de jogo.
 *
 * `"2ª Parte"` → `"2ª p"`, `"Intervalo"` → `"Interv."`. A fonte diz a fase em dois
 * campos: `periodo`, quando consegue separá-la do relógio, e `situacao`, que é o texto
 * cru (`"1ª Parte (13:26)"`). Vale o primeiro que houver.
 *
 * Devolve `null` quando não há nada de útil — e aí a linha mostra "AO VIVO", como antes.
 * Um texto desconhecido e comprido não entra: numa coluna desta largura partia-se em
 * três linhas e empurrava o resultado para baixo.
 */
export function faseCurta(jogo: { periodo?: string | null; situacao?: string | null }): string | null {
	const bruto = (jogo.periodo ?? jogo.situacao ?? '').trim();
	if (!bruto) return null;
	const m = bruto.match(/^(\d+)\s*[ªa]\s*parte/i);
	if (m) return `${m[1]}ª p`;
	if (/^intervalo/i.test(bruto)) return 'Interv.';
	return bruto.length <= 8 ? bruto : null;
}


const ESCALAO_CURTO: Record<string, string> = {
	BENJAMINS: 'BENJ',
	ESCOLARES: 'ESCOL',
	'SENIORES MASCULINOS': 'SEN M',
	'SENIORES FEMININOS': 'SEN F',
	'TORNEIOS PARTICULARES': 'TORN'
};

/**
 * `SENIORES MASCULINOS` → `SEN M`, para a coluna estreita da linha de jogo.
 *
 * Só se abrevia o que não cabe: os `SUB-13` e companhia ficam inteiros, que é como toda a
 * gente lhes chama. Um escalão desconhecido fica como está — truncá-lo às cegas daria
 * coisas sem sentido, e mais vale uma linha ligeiramente mais larga do que uma sigla falsa.
 */
export const escalaoCurto = (cat: string) => ESCALAO_CURTO[cat] ?? cat;
