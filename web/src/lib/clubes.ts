/**
 * Clubes, agrupados a partir das equipas.
 *
 * **O identificador de um clube é o emblema, não o nome.** A fonte publica uma equipa por
 * escalão e por letra — `A STUART HCM`, `A STUART HCM A`, `A STUART HCM B` — e não publica
 * clube nenhum. Mas publica um logótipo por clube, e o nosso raspador guarda-o num ficheiro
 * por clube: medido a 06/10/2026, os 86 nomes de equipa desta época colapsam em **31**
 * ficheiros de emblema.
 *
 * Agrupar pelo emblema é melhor do que agrupar pelo nome por duas razões. A primeira é que
 * dispensa heurísticas de sufixo, e essas erram: um corte ingénuo de " A"/" B" transforma
 * `PAREDE FC` em `PAREDE F` e `CD MAFRA` em `CD MAFR`. A segunda é que apanha as gralhas de
 * graça — `AD OEIRAS` e `AD OERIAS` são o mesmo clube porque partilham o emblema, sem
 * ninguém ter de as declarar.
 */
import type { EquipaIndice, Favorito } from './tipos';

/** Uma equipa de um clube: o escalão e, quando há mais do que uma, a letra. */
export type EquipaDoClube = {
	equipa: string;
	categoria: string;
	competicoes: number[];
};

export type Clube = {
	/** o caminho do emblema, que é o identificador */
	emblema: string;
	nome: string;
	equipas: EquipaDoClube[];
};

/**
 * Os dois nomes que a regra automática não acerta, corrigidos à mão.
 *
 * A regra — nome mais curto do clube, desempate pelo mais usado — acerta em 29 dos 31.
 * Estes dois não têm conserto automático: num a fonte trunca o nome (`S ALENQUER B` é o
 * Benfica de Alenquer, não a equipa B), no outro mete o escalão dentro do nome.
 */
const NOME_A_MAO: Record<string, string> = {
	'S ALENQUER B': 'S ALENQUER BENFICA',
	'HC MEALHADA (S17)': 'HC MEALHADA'
};

/** Tira o que é marca de escalão dentro do nome: `AA COIMBRA (S15)` → `AA COIMBRA`. */
const semSufixoDeEscalao = (nome: string) => nome.replace(/\s*\(S\d+\)\s*$/, '').trim();

/**
 * O nome a mostrar de um clube, a partir dos nomes das suas equipas.
 *
 * O mais curto, porque os nomes das equipas são o do clube mais uma letra. Desempate pelo
 * que aparece em mais jogos, que é o que separa a grafia certa da gralha: `AD OEIRAS`
 * aparece em 16 jogos, `AD OERIAS` em 1.
 */
export function nomeDoClube(nomes: string[], usos: Record<string, number> = {}): string {
	const ordenados = [...nomes].sort(
		(a, b) => a.length - b.length || (usos[b] ?? 0) - (usos[a] ?? 0) || a.localeCompare(b, 'pt')
	);
	const escolhido = ordenados[0] ?? '';
	return NOME_A_MAO[escolhido] ?? semSufixoDeEscalao(escolhido);
}

/**
 * As competições que ainda têm jogos por jogar.
 *
 * É o filtro que limpa a escolha de equipas, e foi o Pedro que o propôs a 06/10/2026: se o
 * ruído vem de competições que já acabaram, filtra-se por competição em vez de se inventar
 * um limite de jogos. A hipótese confirmou-se e o padrão é nítido — um clube inscreve-se nos
 * torneios de abertura com um nome e nos campeonatos regionais com outro. O AE FISICA joga
 * a Supertaça como `AE FISICA` e o campeonato como `AE FISICA D A`; a primeira acabou em
 * Setembro e a segunda vai até Dezembro.
 *
 * Medido: das 37 competições desta época, 26 ainda têm jogos por jogar, e o filtro leva a
 * escolha de 212 pares para 152 — o AE FISICA passa de 33 linhas para 12.
 */
export function competicoesVivas(
	jogos: { comp: number; gc: number | null }[]
): Set<number> {
	const total = new Map<number, number>();
	const jogados = new Map<number, number>();
	for (const j of jogos) {
		total.set(j.comp, (total.get(j.comp) ?? 0) + 1);
		if (j.gc !== null) jogados.set(j.comp, (jogados.get(j.comp) ?? 0) + 1);
	}
	const vivas = new Set<number>();
	for (const [c, n] of total) if ((jogados.get(c) ?? 0) < n) vivas.add(c);
	return vivas;
}

/**
 * O prefixo comum a vários nomes, sem cortar palavras a meio.
 *
 * O recuo até ao espaço só se faz quando o prefixo **cai dentro** de uma palavra: em
 * `PAREDE FC A`/`PAREDE FC B` o comum é `PAREDE FC ` e está bem, mas em `AE FISICA D A` o
 * comum pára em `AE FISICA D ` só porque as letras divergem ali.
 *
 * Recuar sempre era o erro que eu tinha: com `SC TORRES`/`SC TORRES B` o prefixo comum já
 * acaba em fronteira de palavra, e o recuo deixava-o em `SC ` — a etiqueta saía
 * "SUB-17 TORRES". Foi o teste que o apanhou.
 */
function prefixoComum(nomes: string[]): string {
	if (nomes.length < 2) return nomes[0] ?? '';
	let i = 0;
	while (i < nomes[0].length && nomes.every((n) => n[i] === nomes[0][i])) i++;
	const cortaPalavra = nomes.some((n) => i < n.length && n[i] !== ' ');
	if (!cortaPalavra) return nomes[0].slice(0, i);
	return nomes[0].slice(0, nomes[0].lastIndexOf(' ', i - 1) + 1);
}

/**
 * As etiquetas das equipas de um clube **num escalão**: o escalão, e o que distingue.
 *
 * O que distingue é o que sobra depois do prefixo comum, não o nome do clube. Com o filtro
 * das competições vivas, o AE FISICA tem `AE FISICA D A` e `AE FISICA D B` nos sub-13 — o
 * prefixo comum é `AE FISICA D ` e o que distingue é `A` e `B`. Descontar só o nome do clube
 * dava "SUB-13 D A", e esse "D" não distingue nada porque está nos dois.
 */
export function etiquetasDoEscalao(equipas: EquipaDoClube[]): Map<string, string> {
	const nomes = equipas.map((e) => e.equipa);
	const base = prefixoComum(nomes);
	const etiquetas = new Map<string, string>();
	for (const e of equipas) {
		const resto = e.equipa.startsWith(base) ? e.equipa.slice(base.length).trim() : '';
		etiquetas.set(e.equipa, resto ? `${e.categoria} ${resto}` : e.categoria);
	}
	return etiquetas;
}

/** Agrupa o índice de equipas em clubes, por ordem alfabética. */
export function agruparClubes(
	equipas: EquipaIndice[],
	emblemas: Record<string, string>,
	usos: Record<string, number> = {}
): Clube[] {
	const porEmblema = new Map<string, EquipaDoClube[]>();
	for (const e of equipas) {
		const emblema = emblemas[e.equipa];
		if (!emblema) continue; // sem emblema não há clube a que pertencer
		const lista = porEmblema.get(emblema) ?? [];
		lista.push({ equipa: e.equipa, categoria: e.categoria, competicoes: e.competicoes });
		porEmblema.set(emblema, lista);
	}
	return [...porEmblema]
		.map(([emblema, lista]) => ({
			emblema,
			nome: nomeDoClube([...new Set(lista.map((l) => l.equipa))], usos),
			equipas: lista
		}))
		// Alfabética, e não por tamanho: quem vem a este ecrã sabe o nome do clube que procura
		// e varre a grelha à procura dele. Pôr os maiores primeiro servia uma pergunta que
		// ninguém faz aqui.
		.sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
}

/**
 * A família de uma prova: "Campeonato Regional", "Taça", "Encontros Distritais"…
 *
 * É a pergunta que uma pessoa faz ao escolher quem seguir — "isto é o campeonato ou um
 * torneio de pré-época?" — e a fonte responde-a no nome da prova. Seis padrões cobrem as
 * 37 provas desta época; um nome novo cai no `outro` e mostra-se como vem.
 */
const FAMILIAS: [RegExp, string][] = [
	[/^CAMP\.?\s*REG/i, 'Campeonato Regional'],
	[/^ENCONTROS DISTRITAIS/i, 'Encontros Distritais'],
	[/^SUPERTA[ÇC]A/i, 'Supertaça'],
	[/^TA[ÇC]A/i, 'Taça'],
	[/^TORNEIO ABERTURA/i, 'Torneio de Abertura'],
	[/^JOGO TREINO/i, 'Jogos-treino']
];

export function familiaDaProva(nome: string): string {
	for (const [padrao, familia] of FAMILIAS) if (padrao.test(nome)) return familia;
	// um torneio com nome próprio — "ZECA PINTO" — é o que é
	return nome.split(' - ')[0].trim();
}

/** Quantas equipas deste clube a pessoa segue. Zero, uma, ou mais. */
export function seguidasNoClube(clube: Clube, favoritos: Favorito[]): number {
	return clube.equipas.filter((e) =>
		favoritos.some((f) => f.equipa === e.equipa && f.categoria === e.categoria)
	).length;
}
