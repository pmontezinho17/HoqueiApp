/**
 * **O Mérito de um jogo, regra a regra, e a sua conta numa linha.** Funções puras.
 *
 * Pedido do dono a 27/10/2026: *"para além do resultado final desse jogo (que na verdade apenas
 * serve para uma componente dos pontos de bonificação), temos de colocar qual o resultado de
 * mérito"*. Das três formas desenhadas escolheu duas, cada uma no seu sítio:
 *
 * * a **tabela lado a lado** (a forma A), num separador próprio do ecrã de jogo — uma linha por
 *   regra, as duas equipas em coluna, porque a pergunta que nasce ali é "porque é que eles
 *   têm mais do que nós?";
 * * as **duas barras** (da forma C), numa linha só por baixo de cada jogo disputado nas listas.
 *
 * O jogo que fez o dono pedir isto é o 10071, Benjamins, 24/10/2026: a UD Vilafranquense ganhou
 * **21–5** e o Mérito foi **1–11**. Sem a conta à vista, um pai lia a tabela e não percebia.
 *
 * ## Só as regras que deram pontos
 *
 * O regulamento tem 14 alíneas; um jogo usa 2 a 7. Medido nos 79 jogos com Mérito publicados a
 * 27/10/2026: no máximo 7 regras distintas entre as duas equipas. Uma tabela de 14 linhas com
 * dez delas vazias esconde as que interessam — e as regras todas já vivem em "Como se contam
 * estes pontos", no separador da classificação.
 *
 * ## Os nomes das regras vêm daqui, não dos dados
 *
 * O raspador escreve um texto por parcela ("2 com 3 meias partes seguidas"), e esse texto tem
 * contagens por equipa — que numa linha partilhada pelas duas não cabem — e um erro de
 * concordância já publicado ("1 fizeram as quatro meias partes"). Corrigi-lo no raspador
 * obrigava a voltar a pedir todas as fichas à APL. O número da regra diz tudo o que a linha
 * precisa, e a contagem lê-se nos pontos: −2 numa regra de −1 por atleta são dois atletas.
 */
import type { JogoAgenda, MeritoDaEquipa, ParcelaMerito, ResumoMerito } from './tipos';

export type Grupo = 'ganha' | 'perde';

export interface LinhaRegra {
	chave: string;
	grupo: Grupo;
	rotulo: string;
	/** a regra numa frase curta, para quem não a conhece */
	detalhe: string | null;
	/** `null` quando a regra não se aplicou a esta equipa */
	casa: number | null;
	fora: number | null;
}

/** As regras pela ordem do Artigo 92.º, que é a ordem em que aparecem na tabela. */
const REGRAS: { chave: string; rotulo: string; detalhe: string | null }[] = [
	{ chave: '3.1', rotulo: 'Atletas em jogo', detalhe: '+1 por cada atleta que entrou' },
	{ chave: '3.2', rotulo: 'Marcou mais golos', detalhe: null },
	{ chave: '3.3', rotulo: 'Empate', detalhe: '+1 a cada equipa' },
	{ chave: '3.4', rotulo: 'Equipa completa', detalhe: '2 guarda-redes e 8 de campo' },
	{ chave: '4.1.1', rotulo: 'Menos de 8 atletas', detalhe: null },
	{ chave: '4.1.2', rotulo: 'Só um guarda-redes', detalhe: null },
	{ chave: '4.1.3', rotulo: 'Três meias partes seguidas', detalhe: '−1 por atleta' },
	{ chave: '4.1.4', rotulo: 'Três meias partes', detalhe: '−1 por atleta' },
	{ chave: '4.1.5', rotulo: 'E seguidas', detalhe: 'mais −2 por atleta' },
	{ chave: '4.1.6', rotulo: 'As quatro meias partes', detalhe: '−4 por atleta' },
	{ chave: '4.2-azul', rotulo: 'Azul a quem está no banco', detalhe: '−2 por cartão' },
	{ chave: '4.2-acumulacao', rotulo: 'Vermelho ao banco, por acumulação', detalhe: '−4' },
	{ chave: '4.2-directo', rotulo: 'Vermelho directo ao banco', detalhe: '−6' }
];

/**
 * A chave de uma parcela. O 4.2 tem três casos com o mesmo número de regra — azul, vermelho
 * por acumulação e vermelho directo — e só o texto os distingue.
 */
function chaveDe(p: ParcelaMerito): string {
	if (p.regra !== '4.2') return p.regra;
	if (/acumula/.test(p.texto)) return '4.2-acumulacao';
	if (/direct/.test(p.texto)) return '4.2-directo';
	return '4.2-azul';
}

/** As duas contas do jogo, pela equipa e não pela ordem — a ordem é só o recurso. */
export function contasDoJogo(
	merito: MeritoDaEquipa[] | null | undefined,
	casa: string,
	fora: string
): { casa: MeritoDaEquipa; fora: MeritoDaEquipa } | null {
	if (!merito?.length) return null;
	let c = merito.find((m) => m.equipa === casa);
	let f = merito.find((m) => m.equipa === fora);
	if ((!c || !f) && merito.length === 2) [c, f] = merito;
	return c && f ? { casa: c, fora: f } : null;
}

/**
 * As linhas da tabela A: **só as regras que deram pontos a pelo menos uma das equipas**, pela
 * ordem do regulamento, com "ganha" antes de "perde".
 */
export function linhasDoMerito(casa: MeritoDaEquipa, fora: MeritoDaEquipa): LinhaRegra[] {
	const somar = (m: MeritoDaEquipa) => {
		const por = new Map<string, number>();
		for (const p of m.parcelas) por.set(chaveDe(p), (por.get(chaveDe(p)) ?? 0) + p.pontos);
		return por;
	};
	const c = somar(casa);
	const f = somar(fora);
	const linhas: LinhaRegra[] = [];
	for (const r of REGRAS) {
		if (!c.has(r.chave) && !f.has(r.chave)) continue;
		linhas.push({
			...r,
			grupo: r.chave.startsWith('3.') ? 'ganha' : 'perde',
			casa: c.get(r.chave) ?? null,
			fora: f.get(r.chave) ?? null
		});
	}
	// Uma regra que não está no catálogo — uma alínea nova no raspador — não desaparece da
	// conta: aparece com o texto que o raspador escreveu. Os totais têm de bater sempre.
	const conhecidas = new Set(REGRAS.map((r) => r.chave));
	const extra = new Map<string, LinhaRegra>();
	for (const [lado, m] of [['casa', casa], ['fora', fora]] as const) {
		for (const p of m.parcelas) {
			const k = chaveDe(p);
			if (conhecidas.has(k)) continue;
			const l = extra.get(k) ?? {
				chave: k, grupo: p.pontos >= 0 ? 'ganha' : 'perde', rotulo: p.texto,
				detalhe: null, casa: null, fora: null
			};
			l[lado] = (l[lado] ?? 0) + p.pontos;
			extra.set(k, l);
		}
	}
	linhas.push(...extra.values());
	return [...linhas.filter((l) => l.grupo === 'ganha'), ...linhas.filter((l) => l.grupo === 'perde')];
}

/**
 * **A escala das barras é fixa, e é o máximo que uma equipa pode ganhar num jogo:** 10 atletas
 * em jogo, mais 3 por marcar mais golos, mais 1 pela equipa completa. Com uma escala por jogo,
 * um 6 e um 14 desenhavam barras do mesmo tamanho em linhas diferentes da mesma lista.
 */
export const ESCALA_DA_BARRA = 14;

export interface Barra {
	total: number;
	/** fracções da barra, de 0 a 1 */
	ficou: number;
	perdeu: number;
	/** as penalizações passaram as bonificações: o total é negativo */
	abaixoDeZero: boolean;
}

/**
 * Uma barra por equipa: o verde é o que **ficou**, o vermelho o que as penalizações levaram.
 * O comprimento das duas juntas é o que a equipa ganhou, por isso o verde mede o total — e
 * quando as penalizações passam as bonificações (o Sporting CP no 10061: 6 − 17 = −11) a barra
 * fica toda vermelha e é o número que diz quanto abaixo de zero.
 */
export function barraDoMerito([bonificacao, penalizacao]: [number, number]): Barra {
	const escala = Math.max(ESCALA_DA_BARRA, bonificacao);
	const total = bonificacao + penalizacao;
	const ficou = Math.max(total, 0);
	return {
		total,
		ficou: ficou / escala,
		perdeu: (bonificacao - ficou) / escala,
		abaixoDeZero: total < 0
	};
}

/** O que um leitor de ecrã diz da linha do Mérito: a barra sozinha não diz nada. */
export function descricaoDoMerito(r: ResumoMerito, casa: string, fora: string): string {
	const uma = (nome: string, [b, p]: [number, number]) =>
		`${nome} ${b + p}${p ? ` (ganhou ${b}, perdeu ${-p})` : ''}`;
	return `Mérito: ${uma(casa, r.casa)}, ${uma(fora, r.fora)}` +
		(r.por_confirmar ? ', com uma penalização por confirmar' : '');
}

/**
 * O Mérito de cada jogo, pelo id, lido da agenda. Os ecrãs da competição e da equipa desenham
 * as linhas a partir do `comp/`, que não o traz; a agenda já está carregada em todos os ecrãs.
 */
export function meritoPorJogo(agenda: JogoAgenda[] | null | undefined): Map<number, ResumoMerito> {
	const m = new Map<number, ResumoMerito>();
	for (const j of agenda ?? []) if (j.id !== null && j.merito) m.set(j.id, j.merito);
	return m;
}
