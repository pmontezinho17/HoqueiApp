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
import { nomeProprio, nomeProva } from './formato';
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
	/** outra coisa pequena por baixo do número, onde não há lugar: "18 golos" */
	pequeno?: string | null;
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
 * A forma recente das duas equipas **lado a lado, numa vista só**: uma linha por jogo, do
 * **mais recente para o mais antigo**, e em cada lado o jogo tal como foi jogado — a casa à
 * esquerda do resultado —, com a cor do resultado para a equipa dessa coluna.
 *
 * São os cinco últimos disputados, de todas as provas do escalão; no arranque da época são os
 * que houver, e a coluna da equipa que jogou menos fica com buracos em baixo.
 *
 * A ordem já mudou duas vezes, e as duas a pedido do dono, que não se contradisse: o desenho é
 * que mudou. A 06/11/2026 eram bolas numa fila e uma lista por equipa, com botões para escolher
 * a equipa, e numa fila horizontal o tempo corre da esquerda para a direita — ele pediu o mais
 * antigo primeiro. A 07/11/2026 pediu esta grelha, *"tem a informação toda de uma vista única
 * sem ter de carregar em botões"*, com o mais recente em cima e um destaque no primeiro. Numa
 * coluna lê-se de cima para baixo, e o que se procura primeiro é o último jogo.
 */
export interface JogoNaForma {
	id: number;
	data: string;
	casa: string;
	fora: string;
	gc: number;
	gf: number;
	/** o resultado para a equipa da coluna, e não para a da casa desse jogo */
	resultado: Resultado;
}

export function linhasDaForma(p: Prejogo): { casa: JogoNaForma | null; fora: JogoNaForma | null }[] {
	const coluna = (e: EquipaAntesDoJogo): JogoNaForma[] =>
		e.ultimos.map((j) => ({ id: j.id, data: j.data, ...comoFoiJogado(j, e.equipa), resultado: resultadoDe(j) }));
	const a = coluna(p.casa);
	const b = coluna(p.fora);
	return Array.from({ length: Math.max(a.length, b.length) }, (_, i) => ({ casa: a[i] ?? null, fora: b[i] ?? null }));
}

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

// --- fase 2 (06/11/2026): quando marcam, disciplina, treinadores ------------------------------

/**
 * Quantas partes tem o jogo: **quatro nos Benjamins e Escolares, duas daí para cima**, com
 * partes mais compridas à medida que o escalão sobe. Vem do formato mais frequente da equipa da
 * casa, que o raspador lê do relógio de cada ficha.
 *
 * Até 07/11/2026 o separador mostrava sempre quatro períodos com os minutos (`0–9'`, `9–18'`…),
 * mesmo num Sub-13 de duas partes. O dono viu-o no site de testes nesse dia: *"a partir de sub-13
 * só existem 2 partes"*, e pediu a parte pelo nome em vez dos minutos. As contas estavam certas
 * — os quatro quartos somados dois a dois são as duas partes —, o que estava errado era cortar o
 * jogo onde o jogo não tem corte.
 */
export const partesDoJogo = (formato: [number, number] | null | undefined): 2 | 4 => (formato?.[0] === 4 ? 4 : 2);

/**
 * Os golos de cada parte em **percentagem dos golos da equipa**, com o número por baixo.
 *
 * Percentagem porque as duas equipas marcaram números muito diferentes — 134 contra 85 no
 * AD OEIRAS A–CD PAÇO ARCOS A, medido a 06/11/2026 — e o que se quer ver é **quando**, não
 * quantos. Sem destaque: marcar mais cedo não é melhor nem pior.
 *
 * O ficheiro traz quartos do tempo de jogo, e é isso que deixa juntar jogos de formatos
 * diferentes na mesma equipa: num jogo de duas partes cada parte são dois quartos, num de quatro
 * cada parte é um.
 */
/**
 * Percentagens inteiras que **somam sempre 100**, pelo método dos maiores restos: arredonda-se
 * tudo para baixo e os pontos que faltam vão para as partes que ficaram com a maior fracção.
 *
 * Arredondar cada parte por si dava 99% ou 101% — o dono deu por isso a 07/11/2026 num jogo de
 * Escolares, e medido nesse dia sobre os 260 jogos por disputar eram **118 de 384** colunas de
 * quatro partes (77 a 99%, 41 a 101%). Nas de duas partes nunca acontecia: 656 de 656 somavam 100.
 * Em empate de restos ganha a parte mais cedo, para o resultado não depender da ordem do motor.
 */
export function percentagens(valores: number[]): number[] {
	const total = valores.reduce((x, y) => x + y, 0);
	if (!total) return valores.map(() => 0);
	const exactas = valores.map((v) => (100 * v) / total);
	const r = exactas.map(Math.floor);
	let falta = 100 - r.reduce((x, y) => x + y, 0);
	const porResto = exactas.map((x, i) => ({ i, resto: x - Math.floor(x) })).sort((x, y) => y.resto - x.resto || x.i - y.i);
	for (const { i } of porResto) {
		if (falta <= 0) break;
		r[i]++;
		falta--;
	}
	return r;
}

export function linhasDosPeriodos(p: Prejogo, qual: 'marcados' | 'sofridos'): LinhaComparada[] | null {
	const a = p.casa.periodos;
	const b = p.fora.periodos;
	if (!a?.jogos && !b?.jogos) return null;
	const partes = partesDoJogo(a?.formato ?? b?.formato);
	const porParte = (q: number[]) => (partes === 4 ? q : [q[0] + q[1], q[2] + q[3]]);
	const valor = (per: EquipaAntesDoJogo['periodos'], i: number): Valor => {
		const golos = per ? porParte(per[qual]) : [];
		const total = golos.reduce((x, y) => x + y, 0);
		if (!per?.jogos || !total) return { texto: '—', lugar: null };
		return { texto: `${percentagens(golos)[i]}%`, lugar: null, pequeno: plural(golos[i], 'golo', 'golos') };
	};
	return Array.from({ length: partes }, (_, i) => ({
		rotulo: `${i + 1}.ª parte`,
		casa: valor(a, i),
		fora: valor(b, i),
		melhor: null
	}));
}

/**
 * A disciplina e as bolas paradas, lado a lado. Cada linha só aparece quando diz alguma coisa:
 * os vermelhos quando alguém os viu, os penáltis e os livres directos quando alguém os bateu.
 */
export function linhasDaDisciplina(p: Prejogo): LinhaComparada[] {
	const a = p.casa.disciplina;
	const b = p.fora.disciplina;
	if (!a?.jogos && !b?.jogos) return [];
	const linhas: LinhaComparada[] = [];
	const porJogoDe = (rotulo: string, f: (d: NonNullable<typeof a>) => [number, number]) => {
		const v = (d: typeof a): [Valor, number | null] => {
			if (!d) return [{ texto: '—', lugar: null }, null];
			const [n, de] = f(d);
			return de ? [{ texto: decimal(n / de), lugar: null }, n / de] : [{ texto: '—', lugar: null }, null];
		};
		const [x, nx] = v(a);
		const [y, ny] = v(b);
		// menos é melhor em tudo o que é castigo
		const melhor = nx !== null && ny !== null && nx !== ny ? (nx < ny ? 'casa' : 'fora') : null;
		linhas.push({ rotulo, casa: x, fora: y, melhor });
	};
	porJogoDe('Faltas de equipa por jogo', (d) => [d.faltas, d.jogos_com_faltas]);
	porJogoDe('Cartões azuis por jogo', (d) => [d.azuis, d.jogos]);
	if ((a?.vermelhos ?? 0) + (b?.vermelhos ?? 0) > 0) {
		const x = a?.vermelhos ?? 0;
		const y = b?.vermelhos ?? 0;
		linhas.push({
			rotulo: 'Cartões vermelhos',
			casa: { texto: String(x), lugar: null },
			fora: { texto: String(y), lugar: null },
			melhor: x === y ? null : x < y ? 'casa' : 'fora'
		});
	}
	const convertidos = (rotulo: string, f: (d: NonNullable<typeof a>) => [number, number]) => {
		const x = a ? f(a) : ([0, 0] as [number, number]);
		const y = b ? f(b) : ([0, 0] as [number, number]);
		if (!x[1] && !y[1]) return;
		const texto = ([n, de]: [number, number]): Valor => ({ texto: de ? `${n} de ${de}` : '—', lugar: null });
		let melhor: Lado | null = null;
		if (x[1] && y[1] && x[0] / x[1] !== y[0] / y[1]) melhor = x[0] / x[1] > y[0] / y[1] ? 'casa' : 'fora';
		linhas.push({ rotulo, casa: texto(x), fora: texto(y), melhor });
	};
	convertidos('Penáltis marcados', (d) => d.penaltis);
	convertidos('Livres directos marcados', (d) => d.livres);
	return linhas;
}

export interface TreinadoresDoJogo {
	casa: { nome: string; registo: string } | null;
	fora: { nome: string; registo: string } | null;
	/** "Já se defrontaram 3 vezes esta época: …", ou `null` na primeira vez */
	frente: string | null;
}

const registoDe = (t: { jogos: number; vitorias: number; empates: number; derrotas: number }) =>
	`${t.vitorias}V ${t.empates}E ${t.derrotas}D em ${plural(t.jogos, 'jogo', 'jogos')} com a equipa`;

/**
 * Os treinadores e as vezes que já se cruzaram **em qualquer escalão**: um treinador costuma
 * ter mais do que uma equipa, e é aí que isto diz o que o confronto directo das equipas não diz.
 * Medido a 06/11/2026: em 164 dos 260 jogos por disputar, os dois já se tinham defrontado.
 */
export function treinadoresDoJogo(p: Prejogo): TreinadoresDoJogo | null {
	const a = p.casa.treinador;
	const b = p.fora.treinador;
	if (!a && !b) return null;
	const t = p.treinadores;
	let frente: string | null = null;
	if (a && b && t?.jogos) {
		const nomeA = nomeProprio(a.nome);
		const nomeB = nomeProprio(b.nome);
		const partes = [
			t.vitorias ? `${plural(t.vitorias, 'vitória', 'vitórias')} de ${nomeA}` : null,
			t.empates ? plural(t.empates, 'empate', 'empates') : null,
			t.derrotas ? `${plural(t.derrotas, 'vitória', 'vitórias')} de ${nomeB}` : null
		].filter(Boolean);
		frente = `Já se defrontaram ${t.jogos === 1 ? 'uma vez' : `${t.jogos} vezes`} esta época, em todos os escalões: ${partes.join(', ')}.`;
	}
	return {
		casa: a ? { nome: nomeProprio(a.nome), registo: registoDe(a) } : null,
		fora: b ? { nome: nomeProprio(b.nome), registo: registoDe(b) } : null,
		frente
	};
}
