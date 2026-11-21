import { porEscalao } from './escaloes';
import type { JogoAgenda } from './tipos';

/**
 * O filtro dos Jogos do dia: a **liga** em botões, e por baixo a escolha que essa liga tem.
 *
 * ## Porque é que isto existe
 *
 * Com as ligas nacionais (`docs/11-ligas-nacionais.md`) um sábado passa de ~50 jogos para ~70,
 * e o dono temia que a lista deixasse de se ler: *"como vamos ter imensas equipas não sei muito
 * bem como vamos apresentar isto"*. Fizeram-se três ensaios a 17/11/2026 e ele escolheu o
 * primeiro — botões pequenos por baixo dos dias, "Todos" à frente e depois as ligas —, com um
 * ajuste: a lista ao lado deixa de ser sempre a dos escalões e passa a ser **o que cada liga
 * tem para escolher**. A APL tem escalões; a 2.ª divisão tem a Zona Norte e a Zona Sul; a 3.ª
 * tem quatro zonas; o Placard é uma prova só, e não tem lista nenhuma.
 *
 * **A decisão vive aqui e não no `.svelte`**, pela regra do projecto: nenhum teste monta um
 * componente, e um defeito escondido num `{#if}` não se apanhava.
 */

/** A liga de um jogo. A APL é uma liga só, com todos os escalões dentro. */
export function ligaDoJogo(j: Pick<JogoAgenda, 'inq' | 'cat'>): string {
	return j.inq === 'fpp' ? j.cat : 'APL';
}

/** O nome do botão. O Placard é a 1.ª divisão, mas é por "Placard" que toda a gente o conhece. */
const ROTULOS: Record<string, string> = {
	APL: 'APL',
	'1.ª DIVISÃO': 'Placard',
	'2.ª DIVISÃO': '2.ª Divisão',
	'3.ª DIVISÃO': '3.ª Divisão'
};
export const rotuloDaLiga = (l: string) => ROTULOS[l] ?? l;

const ORDEM = ['APL', '1.ª DIVISÃO', '2.ª DIVISÃO', '3.ª DIVISÃO'];
const posicao = (l: string) => {
	const i = ORDEM.indexOf(l);
	return i < 0 ? ORDEM.length : i;
};

export type Opcao = { valor: string | null; rotulo: string; n: number };

/** Os botões: "Todos" à frente e as ligas com jogos neste dia, cada uma com quantos. */
export function opcoesDeLiga(jogos: JogoAgenda[]): Opcao[] {
	const n = new Map<string, number>();
	for (const j of jogos) n.set(ligaDoJogo(j), (n.get(ligaDoJogo(j)) ?? 0) + 1);
	const ligas = [...n.keys()].sort((a, b) => posicao(a) - posicao(b) || a.localeCompare(b, 'pt'));
	return [
		{ valor: null, rotulo: 'Todos', n: jogos.length },
		...ligas.map((l) => ({ valor: l, rotulo: rotuloDaLiga(l), n: n.get(l)! }))
	];
}

/** As divisões nacionais escolhem-se pela zona; tudo o resto pelo escalão. */
const porZona = (liga: string | null) => liga !== null && liga !== 'APL';

/** O valor de um jogo na lista ao lado: a zona numa divisão, o escalão no resto. */
const valorNaLista = (j: JogoAgenda, liga: string | null) =>
	porZona(liga) ? (j.serie ?? null) : j.cat;

const nomeDaZona = (serie: string) =>
	`Zona ${serie.charAt(0)}${serie.slice(1).toLowerCase().replace(/ (\w)$/, (_, l) => ` ${l.toUpperCase()}`)}`;

/**
 * A lista ao lado dos botões, ou `null` quando não há nada a escolher.
 *
 * **Só o que este dia tem**, como a lista dos escalões já fazia: oferecer a Zona Sul num dia
 * em que só a Norte joga era uma escolha que dava uma página vazia. E **uma só opção não é
 * escolha** — é o caso do Placard, que o dono deu como exemplo, e é também o de uma divisão
 * num dia em que só uma zona joga.
 */
export function escolhasDaLiga(
	jogos: JogoAgenda[],
	liga: string | null
): { todos: string; rotulo: string; opcoes: { valor: string; rotulo: string }[] } | null {
	const daLiga = liga === null ? jogos : jogos.filter((j) => ligaDoJogo(j) === liga);
	const valores = [...new Set(daLiga.map((j) => valorNaLista(j, liga)))].filter(
		(v): v is string => !!v
	);
	if (valores.length < 2) return null;
	if (porZona(liga))
		return {
			todos: 'Todas as zonas',
			rotulo: 'Filtrar por zona',
			opcoes: valores.sort().map((v) => ({ valor: v, rotulo: nomeDaZona(v) }))
		};
	return {
		todos: 'Todos os escalões',
		rotulo: 'Filtrar por escalão',
		opcoes: valores
			.sort(porEscalao)
			.map((v) => ({ valor: v, rotulo: v.replace('SENIORES ', 'SEN. ') }))
	};
}

/**
 * Os jogos de um dia com a liga e a escolha da lista aplicadas.
 *
 * **Indulgente, como o filtro de escalão sempre foi** (ver `PaginaDia`): há três dias montados
 * ao mesmo tempo, e ao arrastar para um dia sem jogos dessa liga, filtrar dava uma página vazia
 * a meio do gesto. Um dia que não tem o que se escolheu mostra tudo, e os botões voltam a
 * "Todos" quando o dia assenta.
 */
export function filtrarDoDia(jogos: JogoAgenda[], liga: string | null, escolha: string | null): JogoAgenda[] {
	let js = jogos;
	if (liga !== null && js.some((j) => ligaDoJogo(j) === liga)) js = js.filter((j) => ligaDoJogo(j) === liga);
	if (escolha !== null && js.some((j) => valorNaLista(j, liga) === escolha))
		js = js.filter((j) => valorNaLista(j, liga) === escolha);
	return js;
}
