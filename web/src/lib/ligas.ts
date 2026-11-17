import { porEscalao } from './escaloes';
import type { JogoAgenda } from './tipos';

/** A liga de um jogo, para o filtro dos Jogos do dia. A APL é uma liga só: Lisboa. */
export function ligaDoJogo(j: Pick<JogoAgenda, 'inq' | 'cat'>): string {
	if (j.inq !== 'fpp') return 'LISBOA';
	return j.cat;
}

const ROTULOS: Record<string, string> = {
	LISBOA: 'Lisboa',
	'1.ª DIVISÃO': 'Placard',
	'2.ª DIVISÃO': '2.ª Divisão',
	'3.ª DIVISÃO': '3.ª Divisão'
};
export const rotuloDaLiga = (l: string) => ROTULOS[l] ?? l;

const ORDEM = ['LISBOA', '1.ª DIVISÃO', '2.ª DIVISÃO', '3.ª DIVISÃO'];

export type Opcao = { valor: string | null; rotulo: string; n: number };

/** As ligas com jogos neste dia, com quantos, e "Todos" à frente. */
export function opcoesDeLiga(jogos: JogoAgenda[]): Opcao[] {
	const n = new Map<string, number>();
	for (const j of jogos) n.set(ligaDoJogo(j), (n.get(ligaDoJogo(j)) ?? 0) + 1);
	const ligas = [...n.keys()].sort((a, b) => ORDEM.indexOf(a) - ORDEM.indexOf(b));
	return [{ valor: null, rotulo: 'Todos', n: jogos.length }, ...ligas.map((l) => ({ valor: l, rotulo: rotuloDaLiga(l), n: n.get(l)! }))];
}

/** Ensaio 2: uma fita só, com as divisões nacionais e os escalões da APL lado a lado. */
export function opcoesNumaFita(jogos: JogoAgenda[]): Opcao[] {
	const n = new Map<string, number>();
	const chave = (j: JogoAgenda) => (j.inq === 'fpp' ? j.cat : `APL:${j.cat}`);
	for (const j of jogos) n.set(chave(j), (n.get(chave(j)) ?? 0) + 1);
	const nac = [...n.keys()].filter((k) => !k.startsWith('APL:')).sort((a, b) => ORDEM.indexOf(a) - ORDEM.indexOf(b));
	const apl = [...n.keys()].filter((k) => k.startsWith('APL:')).sort((a, b) => porEscalao(a.slice(4), b.slice(4)));
	const curto = (c: string) => c.replace('SENIORES MASCULINOS', 'Sen. M').replace('SENIORES FEMININOS', 'Sen. F')
		.replace('TORNEIOS PARTICULARES', 'Torneios').replace(/^(\w)(\w+)$/u, (_, a, b) => a + b.toLowerCase());
	return [
		{ valor: null, rotulo: 'Todos', n: jogos.length },
		...nac.map((k) => ({ valor: k, rotulo: rotuloDaLiga(k), n: n.get(k)! })),
		...apl.map((k) => ({ valor: k, rotulo: curto(k.slice(4)), n: n.get(k)! }))
	];
}

export const correspondeNumaFita = (j: JogoAgenda, valor: string | null) =>
	valor === null || (valor.startsWith('APL:') ? j.inq !== 'fpp' && j.cat === valor.slice(4) : j.inq === 'fpp' && j.cat === valor);

/** Ensaio 3: dois níveis — âmbito e, por baixo, a divisão ou o escalão. */
export function opcoesDeAmbito(jogos: JogoAgenda[]): Opcao[] {
	const nac = jogos.filter((j) => j.inq === 'fpp').length;
	const lis = jogos.length - nac;
	return [
		{ valor: null, rotulo: 'Todos', n: jogos.length },
		...(nac ? [{ valor: 'NACIONAL', rotulo: 'Nacional', n: nac }] : []),
		...(lis ? [{ valor: 'LISBOA', rotulo: 'Lisboa', n: lis }] : [])
	];
}
