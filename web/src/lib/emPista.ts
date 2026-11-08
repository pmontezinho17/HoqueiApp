/**
 * Quem jogou cada período, nos Escolares e Benjamins — dentro do separador Equipas.
 *
 * Pedido do dono numa sugestão pela app a 07/11/2026. Nesse dia foi um separador próprio, o
 * "Em pista"; a 08/11 ele achou que eram separadores a mais e escolheu, entre cinco
 * simulações, juntá-lo à tabela das Equipas: quatro quadradinhos a seguir ao nome, um por
 * período, cheios onde o atleta jogou, e os golos desse período **em número** dentro do
 * quadrado. As bolas uma a uma não cabiam: medido nos 110 jogos destes escalões, um atleta
 * chegou a marcar 7 golos num só período de 8 minutos, e 14 num jogo.
 *
 * O `J` é quem entrou a meio do período (`docs/09-regulamento-apl.md`): conta como meia parte
 * jogada e pesa no Mérito, e por isso vai a amarelo, como no separador do Mérito.
 */
import type { EquipaEmPista, FichaJogo, LinhaJogador } from './tipos';

export type EstadoNoPeriodo = 'jogou' | 'entrou' | 'fora';

export interface LinhaEmPista {
	numero: string | null;
	nome: string;
	gr: boolean;
	periodos: { estado: EstadoNoPeriodo; golos: number }[];
	/** o total do jogo; `null` quando a ficha não deixa contar os golos por período */
	golos: number | null;
}

export interface EquipaNaPista {
	equipa: string;
	linhas: LinhaEmPista[];
}

/** Qualquer marca conta como jogada, e não só o `X` — a mesma regra do raspador. */
function estado(marca: string): EstadoNoPeriodo {
	const m = (marca ?? '').trim().toUpperCase();
	return m === 'J' ? 'entrou' : m ? 'jogou' : 'fora';
}

function daEquipa(e: EquipaEmPista): EquipaNaPista {
	return {
		equipa: e.equipa,
		linhas: e.atletas.map((a) => ({
			numero: a.numero,
			nome: a.nome,
			gr: a.gr,
			periodos: [0, 1, 2, 3].map((i) => ({ estado: estado(a.marcas[i]), golos: a.golos?.[i] ?? 0 })),
			golos: a.golos ? a.golos.reduce((s, g) => s + g, 0) : null
		}))
	};
}

/** As duas equipas, ou `null` quando não há grelha — e aí a tabela das Equipas fica como sempre. */
export function emPistaDoJogo(f: Pick<FichaJogo, 'em_pista'>): EquipaNaPista[] | null {
	const e = f.em_pista;
	if (!Array.isArray(e) || e.length !== 2 || !e.some((x) => x.atletas?.length)) return null;
	return e.map(daEquipa);
}

/**
 * A grelha de uma linha da tabela das Equipas. São duas tabelas diferentes na ficha da APL —
 * a dos jogadores (`#jugadores`) e o boletim (`#acta`) —, por isso a ligação faz-se pelo nome e,
 * quando o nome não bate, pelo número da camisola. Na amostra com boletim os dez nomes e os dez
 * números de cada equipa batem todos (08/11/2026); o teste com as fichas publicadas é quem o
 * confirma em todas, quando houver grelhas.
 */
export function linhaDoJogador(
	equipa: EquipaNaPista,
	j: Pick<LinhaJogador, 'nome' | 'numero'>
): LinhaEmPista | null {
	return (
		equipa.linhas.find((l) => l.nome === j.nome) ??
		(j.numero ? equipa.linhas.find((l) => l.numero === j.numero) : undefined) ??
		null
	);
}

/**
 * Golos e assistências numa célula só, "1G/1A" — pedido do dono a 08/11/2026, para a tabela
 * caber a 375px sem rolar. Medido nas 109 fichas com Mérito: das 1 944 linhas de atleta, 616
 * têm golos e 159 têm assistências — as duas colunas juntas estavam quase sempre a "–".
 */
export function golosEAssistencias(j: Pick<LinhaJogador, 'golos' | 'assistencias'>): string {
	const g = j.golos ?? 0;
	const a = j.assistencias ?? 0;
	return [g ? `${g}G` : '', a ? `${a}A` : ''].filter(Boolean).join('/') || '–';
}
