/**
 * A ordem dos escalões, do mais novo para o mais velho.
 *
 * É a ordem por que a modalidade fala deles, e tem de ser a mesma nos chips de filtro e
 * nos blocos da lista — estavam em sítios diferentes e por isso divergiam. Vive aqui para
 * só haver uma.
 *
 * Um escalão que não esteja nesta lista vai para o fim, por ordem alfabética, em vez de
 * desaparecer ou de se enfiar a meio: a fonte pode inventar um nome novo a meio da época.
 */
export const ORDEM = [
	'BAMBIS',
	'BENJAMINS',
	'ESCOLARES',
	'SUB-13',
	'SUB-15',
	'SUB-17',
	'SUB-19',
	'SUB-23',
	'SENIORES FEMININOS',
	'SENIORES MASCULINOS',
	'TORNEIOS PARTICULARES'
] as const;

const posicao = (cat: string) => {
	const i = ORDEM.indexOf(cat as (typeof ORDEM)[number]);
	return i < 0 ? ORDEM.length : i;
};

/** Comparador para `sort`, pela ordem acima e depois alfabético. */
export const porEscalao = (a: string, b: string) =>
	posicao(a) - posicao(b) || a.localeCompare(b, 'pt');
