/**
 * O separador "Antes do jogo" (#11, fase 1): o que se diz de um jogo por disputar.
 *
 * Os números vêm feitos do raspador, no `prejogo/<id>.json` — ver
 * `scraper/src/hoquei/prejogo.py` para o porquê de não se calcularem aqui. O que fica deste
 * lado é a **decisão do que se mostra**, e vive num módulo e não no `.svelte` pela regra do
 * projecto: nenhum teste monta um componente, e um `{#if}` dentro de um ecrã é invisível para
 * a suite inteira.
 *
 * O desenho partiu das doze capturas que o dono trouxe a 06/11/2026, de cinco apps de
 * desporto. Ficou o que os nossos dados permitem dizer com verdade — e ficou de fora o que
 * não: remates, posse de bola, defesas (só 141 das 521 fichas as registam) e tudo o que tenha
 * a forma de uma aposta.
 */
import { nomeProva } from './formato';
import type { EquipaAntesDoJogo, JogoDaForma, Prejogo, Vezes } from './tipos';

export type Resultado = 'V' | 'E' | 'D';
export type Lado = 'casa' | 'fora';

export const resultadoDe = (j: Pick<JogoDaForma, 'marcados' | 'sofridos'>): Resultado =>
	j.marcados > j.sofridos ? 'V' : j.marcados < j.sofridos ? 'D' : 'E';

/**
 * **Abaixo de três equipas, um lugar não diz nada.** Numa série de duas, ser "2.º em golos"
 * é só ser o outro. Os lugares contam as equipas que já jogaram, e no arranque de uma fase
 * podem ser duas.
 */
export const MINIMO_PARA_LUGARES = 3;
/** a partir de quantos jogos seguidos uma sequência merece uma linha */
export const SEQUENCIA_QUE_CONTA = 3;

/**
 * Há separador quando há alguma coisa para dizer: pelo menos uma das equipas já jogou.
 *
 * Num arranque de época as duas estão a zero, e um separador com seis traços era pior do que
 * não ter separador nenhum.
 */
export function temAntesDoJogo(p: Prejogo | null | undefined): p is Prejogo {
	return !!p && (p.casa.epoca.jogos > 0 || p.fora.epoca.jogos > 0);
}

const decimal = (n: number) => n.toFixed(1).replace('.', ',');

export interface Valor {
	texto: string;
	/** "2.º", ou `null` quando não se mostra — ver `MINIMO_PARA_LUGARES` */
	lugar: string | null;
}

export interface LinhaComparada {
	rotulo: string;
	casa: Valor;
	fora: Valor;
	/** o lado que está melhor neste número, para o destacar; `null` num empate ou sem termo */
	melhor: Lado | null;
}

type Medida = {
	rotulo: string;
	lugar?: keyof EquipaAntesDoJogo['lugares'];
	/** o número por jogo, para comparar; `null` quando a equipa ainda não jogou */
	valor: (e: EquipaAntesDoJogo) => number | null;
	texto: (e: EquipaAntesDoJogo) => string;
	/** `false` quando menos é melhor, como nos golos sofridos */
	maiorEMelhor?: boolean;
	/** sem destaque: o número de jogos não é melhor nem pior */
	semMelhor?: boolean;
};

const porJogo = (f: (e: EquipaAntesDoJogo['epoca']) => number) => (e: EquipaAntesDoJogo) =>
	e.epoca.jogos ? f(e.epoca) / e.epoca.jogos : null;

const MEDIDAS_DA_EPOCA: Medida[] = [
	{ rotulo: 'Jogos', valor: (e) => e.epoca.jogos, texto: (e) => String(e.epoca.jogos), semMelhor: true },
	{
		rotulo: 'Vitórias',
		lugar: 'vitorias',
		valor: porJogo((n) => n.vitorias),
		texto: (e) => `${Math.round((100 * e.epoca.vitorias) / e.epoca.jogos)}%`
	},
	{
		rotulo: 'Golos marcados por jogo',
		lugar: 'marcados',
		valor: porJogo((n) => n.marcados),
		texto: (e) => decimal(e.epoca.marcados / e.epoca.jogos)
	},
	{
		rotulo: 'Golos sofridos por jogo',
		lugar: 'sofridos',
		valor: porJogo((n) => n.sofridos),
		texto: (e) => decimal(e.epoca.sofridos / e.epoca.jogos),
		maiorEMelhor: false
	},
	{
		rotulo: 'Diferença de golos por jogo',
		lugar: 'diferenca',
		valor: porJogo((n) => n.marcados - n.sofridos),
		texto: (e) => {
			const d = (e.epoca.marcados - e.epoca.sofridos) / e.epoca.jogos;
			return `${d > 0 ? '+' : ''}${decimal(d)}`;
		}
	},
	{
		rotulo: 'Jogos sem sofrer',
		lugar: 'sem_sofrer',
		valor: porJogo((n) => n.sem_sofrer),
		texto: (e) => String(e.epoca.sem_sofrer)
	}
];

function comparar(p: Prejogo, m: Medida): LinhaComparada {
	const comLugares = p.na_serie >= MINIMO_PARA_LUGARES;
	const valor = (e: EquipaAntesDoJogo): Valor => {
		if (!e.epoca.jogos) return { texto: '—', lugar: null };
		const l = m.lugar ? e.lugares[m.lugar] : undefined;
		return { texto: m.texto(e), lugar: comLugares && l ? `${l}.º` : null };
	};
	const a = m.valor(p.casa);
	const b = m.valor(p.fora);
	let melhor: Lado | null = null;
	if (!m.semMelhor && a !== null && b !== null && a !== b) {
		melhor = (a > b) === (m.maiorEMelhor ?? true) ? 'casa' : 'fora';
	}
	return { rotulo: m.rotulo, casa: valor(p.casa), fora: valor(p.fora), melhor };
}

/** A época das duas equipas, número a número e lado a lado. */
export function linhasDaEpoca(p: Prejogo): LinhaComparada[] {
	return MEDIDAS_DA_EPOCA.map((m) => comparar(p, m));
}

/** Diz se os lugares aparecem, para a legenda que explica o que são. */
export const mostraLugares = (p: Prejogo) => p.na_serie >= MINIMO_PARA_LUGARES;

type Contagem = {
	rotulo: string;
	de: (e: EquipaAntesDoJogo) => Vezes;
	maiorEMelhor?: boolean;
};

const CONTAGENS: Contagem[] = [
	{ rotulo: 'Marcou primeiro', de: (e) => e.sequencias.marcou_primeiro },
	{ rotulo: 'Ganhou quando marcou primeiro', de: (e) => e.sequencias.ganhou_depois_de_marcar_primeiro },
	{ rotulo: 'A ganhar ao intervalo', de: (e) => e.sequencias.ganhava_ao_intervalo },
	{ rotulo: 'A perder ao intervalo', de: (e) => e.sequencias.perdia_ao_intervalo, maiorEMelhor: false }
];

/**
 * Quem marca primeiro e como vai ao intervalo, em "4 de 6".
 *
 * **"De" e não percentagem**, porque os totais são pequenos e diferentes de uma equipa para a
 * outra: "100%" de um jogo e "83%" de seis lado a lado davam a entender que o primeiro número
 * é o melhor. A comparação para o destaque faz-se pela proporção; o texto diz as duas coisas.
 * Uma linha em que nenhuma equipa tem jogos que contem não aparece.
 */
export function linhasDasContagens(p: Prejogo): LinhaComparada[] {
	return CONTAGENS.filter((c) => c.de(p.casa).de > 0 || c.de(p.fora).de > 0).map((c) => {
		const a = c.de(p.casa);
		const b = c.de(p.fora);
		const texto = (v: Vezes): Valor => ({ texto: v.de ? `${v.vezes} de ${v.de}` : '—', lugar: null });
		let melhor: Lado | null = null;
		if (a.de && b.de) {
			const x = a.vezes / a.de;
			const y = b.vezes / b.de;
			if (x !== y) melhor = (x > y) === (c.maiorEMelhor ?? true) ? 'casa' : 'fora';
		}
		return { rotulo: c.rotulo, casa: texto(a), fora: texto(b), melhor };
	});
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/**
 * As sequências em curso que merecem uma linha, por ordem de importância: três vitórias
 * seguidas, cinco jogos sem perder, marcou em todos.
 *
 * **Uma sequência que é a mesma coisa que outra não se repete.** Três vitórias seguidas são
 * também três jogos sem perder; dizer as duas é encher a lista. Só se diz o "sem perder"
 * quando é mais comprido do que a série de vitórias.
 */
export function sequenciasEmCurso(e: EquipaAntesDoJogo): string[] {
	const s = e.sequencias;
	const jogos = e.epoca.jogos;
	const linhas: string[] = [];
	const r = s.resultado;
	if (r && r.n >= 2) {
		const nome = { V: ['vitória seguida', 'vitórias seguidas'], E: ['empate seguido', 'empates seguidos'], D: ['derrota seguida', 'derrotas seguidas'] }[r.tipo];
		linhas.push(plural(r.n, nome[0], nome[1]));
	}
	const vitoriasSeguidas = r?.tipo === 'V' ? r.n : 0;
	const derrotasSeguidas = r?.tipo === 'D' ? r.n : 0;
	if (s.sem_perder >= SEQUENCIA_QUE_CONTA && s.sem_perder > vitoriasSeguidas) {
		linhas.push(s.sem_perder === jogos ? 'Ainda não perdeu esta época' : `${s.sem_perder} jogos sem perder`);
	}
	if (s.sem_ganhar >= SEQUENCIA_QUE_CONTA && s.sem_ganhar > derrotasSeguidas) {
		linhas.push(s.sem_ganhar === jogos ? 'Ainda não ganhou esta época' : `${s.sem_ganhar} jogos sem ganhar`);
	}
	if (s.a_marcar >= SEQUENCIA_QUE_CONTA) {
		linhas.push(s.a_marcar === jogos ? 'Marcou em todos os jogos' : `Marcou nos últimos ${s.a_marcar} jogos`);
	}
	if (s.a_sofrer >= SEQUENCIA_QUE_CONTA) {
		linhas.push(s.a_sofrer === jogos ? 'Sofreu golos em todos os jogos' : `Sofreu golos nos últimos ${s.a_sofrer} jogos`);
	}
	return linhas;
}

/**
 * Os últimos jogos de uma equipa, **do mais antigo para o mais recente** — nas bolas e na
 * lista por baixo delas.
 *
 * São os cinco últimos disputados, de todas as provas do escalão; no arranque da época são os
 * que houver, e nenhum quando a equipa ainda não jogou. O ficheiro traz-os do mais recente para
 * o mais antigo, e foi assim que saíram a 06/11/2026. O dono apanhou-o no site de testes nesse
 * dia, primeiro nas bolas e depois na lista: uma fila de resultados lê-se como uma linha do
 * tempo, com o último jogo no fim, encostado ao jogo que vem.
 */
export const jogosDaForma = (e: Pick<EquipaAntesDoJogo, 'ultimos'>): JogoDaForma[] => [...e.ultimos].reverse();

export const bolasDaForma = (e: Pick<EquipaAntesDoJogo, 'ultimos'>): Resultado[] =>
	jogosDaForma(e).map(resultadoDe);

/** O confronto directo, contado do lado da equipa da casa deste jogo. */
export function resumoDosConfrontos(p: Prejogo): { casa: number; empates: number; fora: number } {
	const r = { casa: 0, empates: 0, fora: 0 };
	for (const j of p.confrontos) {
		const x = resultadoDe(j);
		if (x === 'V') r.casa++;
		else if (x === 'D') r.fora++;
		else r.empates++;
	}
	return r;
}

/**
 * Um jogo do confronto directo com as equipas no sítio onde jogaram — a da casa à esquerda,
 * como em qualquer resultado — e não no sítio onde estão neste jogo.
 */
export function comoFoiJogado(j: JogoDaForma, casaDesteJogo: string) {
	return j.em_casa
		? { casa: casaDesteJogo, fora: j.adversario, gc: j.marcados, gf: j.sofridos }
		: { casa: j.adversario, fora: casaDesteJogo, gc: j.sofridos, gf: j.marcados };
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/**
 * "25 out", sem o dia da semana. Numa coluna de 375px o `dataCurta` — "domingo, 25 out" —
 * partia-se em duas linhas em quatro dos cinco jogos (visto a 06/11/2026), e numa lista de
 * jogos passados o dia da semana não diz nada a ninguém.
 */
export function diaCurto(iso: string): string {
	const [, m, d] = iso.split('-').map(Number);
	return `${d} ${MESES[m - 1]}`;
}

/**
 * O nome da prova de um jogo da lista, **só quando não é a deste**. Quase todos são da mesma
 * prova, e repetir "Camp. Reg. Sub-15 - 1ª Fase" cinco vezes, cortado a meio, não dizia nada;
 * o que vale a pena ver é a Supertaça ou o Torneio de Abertura no meio do campeonato.
 */
export function outraProva(j: Pick<JogoDaForma, 'comp' | 'prova'>, comp: number | null | undefined): string | null {
	return j.comp === comp ? null : nomeProva(j.prova);
}
