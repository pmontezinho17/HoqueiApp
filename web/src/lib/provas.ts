import { disputado, type Competicao, type Jogo } from './tipos';

/**
 * A prova onde a equipa está **agora** — o que se quer ver por defeito na classificação e
 * no plantel, em vez da primeira da lista, que pode ser um torneio de abertura já fechado.
 *
 * A ordem é esta, e é do ponto de vista da equipa e não da prova: uma prova em que o clube
 * já foi eliminado não está "a decorrer" para quem abre a página.
 *
 *  1. **a meio** — já jogou e ainda tem jogos marcados; entre várias, a do jogo mais próximo;
 *  2. **por começar** — nenhum jogo disputado e já com calendário; a do jogo mais próximo;
 *  3. **terminada ou parada** — a do último jogo disputado.
 *
 * O caso 3 inclui de propósito as provas cujos jogos por disputar estão todos no passado:
 * são jogos que a fonte nunca fechou, e tratá-las como "a meio" punha uma prova morta à
 * frente do campeonato a sério.
 */
export function provaActual(
	provas: { id: number; jogos: Jogo[] }[],
	hoje = new Date().toISOString().slice(0, 10)
): number | null {
	const chave = (jogos: Jogo[]) => {
		const feitos = jogos.filter(disputado).map((j) => j.data ?? '').sort();
		const futuros = jogos
			.filter((j) => !disputado(j) && (j.data ?? '9999-99-99') >= hoje)
			.map((j) => j.data ?? '9999-99-99')
			.sort();
		if (futuros.length) return [feitos.length ? 0 : 1, futuros[0]] as const;
		return [2, feitos.at(-1) ? `9999-${feitos.at(-1)}` : '9999-9999-99-99'] as const;
	};
	const ordenadas = provas
		.map((p) => ({ id: p.id, k: chave(p.jogos) }))
		.sort((a, b) => a.k[0] - b.k[0] || (a.k[0] === 2 ? b.k[1].localeCompare(a.k[1]) : a.k[1].localeCompare(b.k[1])));
	return ordenadas[0]?.id ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────────────────
// O menu de Competições: agrupar as séries e dizer o que já acabou (P12.1).
//
// Vive aqui ao lado do `provaActual` porque as duas respondem à mesma família de perguntas —
// "qual destas provas interessa agora?" — uma do ponto de vista de uma equipa, outra do
// ponto de vista do menu.
//
// ## O problema, medido
//
// A 08/10/2026 o menu tinha 20 entradas e **9 não tinham um único jogo por disputar** — as
// Supertaças e os Torneios de Abertura de setembro. Quem entra à procura do escalão do filho
// tinha de os saltar todos.
//
// ## Esconder não é filtrar, e isto já me custou uma correcção
//
// A 06/10/2026 escondi, no ecrã de escolha de equipas, os escalões sem prova a decorrer. O
// dono apanhou-me: o HC SINTRA só joga Taças já terminadas, e as duas equipas seniores
// **desapareceram** da app. A lição não é "não filtrar": é que **o que se tira tem de ser
// contado e ter porta de entrada**.
//
// Por isso o `agruparProvas` nunca devolve menos do que recebeu — devolve tudo, marcado, e
// diz quantas acabaram. Quem desenha decide, e tem o número para escrever no interruptor.

export type Prova = {
	/** o `grupo_id`, ou o id da competição quando ela não pertence a um grupo */
	id: string;
	nome: string;
	categoria: string;
	/** as séries desse grupo, ordenadas: "A B C" */
	series: string[];
	/** false quando nenhuma competição do grupo tem jogos por disputar */
	viva: boolean;
};

/** A ordem por que os escalões aparecem. Do mais velho para o mais novo, como na app toda. */
export const ORDEM_ESCALOES = [
	'SENIORES MASCULINOS',
	'SENIORES FEMININOS',
	'SUB-23',
	'SUB-19',
	'SUB-17',
	'SUB-15',
	'SUB-13',
	'ESCOLARES',
	'BENJAMINS',
	'BAMBIS'
];

/**
 * Uma entrada por grupo e não por série: 37 competições viram 20 entradas.
 *
 * **Um grupo está vivo se qualquer uma das suas séries estiver viva.** Uma prova a três
 * séries em que duas acabaram ainda está a decorrer, e marcá-la como terminada escondia a
 * série que está a jogar.
 */
export function agruparProvas(
	competicoes: Competicao[],
	vivas: Set<number>
): { escaloes: [string, Prova[]][]; terminadas: number; nadaVivo: boolean } {
	const m = new Map<string, Prova>();
	for (const c of competicoes) {
		const id = c.grupo_id ?? String(c.id);
		const g =
			m.get(id) ??
			m
				.set(id, {
					id,
					nome: c.grupo_nome ?? c.nome,
					categoria: c.categoria,
					series: [],
					viva: false
				})
				.get(id)!;
		if (c.serie) g.series.push(c.serie);
		g.viva = g.viva || vivas.has(c.id);
	}

	const lista = [...m.values()].map((g) => ({ ...g, series: g.series.sort() }));
	const porEscalao = new Map<string, Prova[]>();
	for (const g of lista) {
		(porEscalao.get(g.categoria) ?? porEscalao.set(g.categoria, []).get(g.categoria)!).push(g);
	}

	const escaloes: [string, Prova[]][] = [...porEscalao].sort((a, b) => {
		const ia = ORDEM_ESCALOES.indexOf(a[0]);
		const ib = ORDEM_ESCALOES.indexOf(b[0]);
		return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a[0].localeCompare(b[0]);
	});

	const terminadas = lista.filter((g) => !g.viva).length;
	return { escaloes, terminadas, nadaVivo: lista.length > 0 && terminadas === lista.length };
}

/**
 * O que mostrar, dado o interruptor.
 *
 * Separada da agregação porque é a decisão, e a decisão é onde já me enganei uma vez. Um
 * escalão fica de fora só quando **todas** as suas provas estão terminadas e o filtro está
 * ligado: assim nunca desaparece um escalão que tenha uma única série a jogar.
 */
export function filtrarProvas(
	escaloes: [string, Prova[]][],
	mostrarTudo: boolean
): [string, Prova[]][] {
	if (mostrarTudo) return escaloes;
	return escaloes
		.map(([e, provas]): [string, Prova[]] => [e, provas.filter((p) => p.viva)])
		.filter(([, provas]) => provas.length > 0);
}

/**
 * O endereço do menu de Competições, com uma coisa trocada e o resto preservado.
 *
 * **Vive aqui e não dentro do componente porque é o que parte em silêncio.** Na consola, há
 * uma hora, um gráfico montava os seus links à mão e esqueceu-se da vista nova: clicar num dia
 * levava para o sítio errado, e nada acusou. Um construtor só, testado, não tem esse problema.
 *
 * O estado deste ecrã é **todo** o endereço: qual o escalão aberto e se as provas terminadas
 * estão à vista. Nada em memória — assim recarregar, partilhar e voltar atrás mostram o mesmo.
 */
export function enderecoDoMenu(estado: { escalao?: string | null; tudo?: boolean }): string {
	const p = new URLSearchParams();
	if (estado.escalao) p.set('escalao', estado.escalao);
	if (estado.tudo) p.set('tudo', '1');
	const q = p.toString();
	return q ? `/competicoes?${q}` : '/competicoes';
}

/**
 * Tira dos nomes de um escalão a parte que é igual em todos.
 *
 * **O que se repete não distingue, e por isso não se lê.** O dono apanhou-o a 09/10/2026: nos
 * Escolares lia-se duas vezes "ENCONTROS DISTRITAIS ESCOLARES - 1ª FASE NIVEL …" e o que
 * mudava — o I e o II — estava no fim de uma linha e meia de texto igual.
 *
 * ```
 * ENCONTROS DISTRITAIS ESCOLARES - 1ª FASE NIVEL I    →  1ª FASE NIVEL I
 * ENCONTROS DISTRITAIS ESCOLARES - 1ª FASE NIVEL II   →  1ª FASE NIVEL II
 * ```
 *
 * **Corta-se só num separador ` - `, e não no prefixo comum em bruto.** Em bruto, o prefixo
 * daqueles dois é `…NIVEL ` e o que sobrava era "I" e "II" — verdadeiro, inútil, e impossível
 * de ler daqui a uns meses quando houver uma 2ª fase. No separador sobra `1ª FASE NIVEL I`,
 * que é o que ele pediu e o que continua a distinguir quando a 2ª fase chegar.
 *
 * Um escalão cujos nomes não partilhem nada — a Supertaça, o Torneio de Abertura e o
 * Campeonato dos sub-19 — fica como está. **Nunca devolve vazio:** se o corte comesse o nome
 * todo, fica o nome todo, porque um rótulo em branco é pior do que um rótulo comprido.
 */
export function semPrefixoComum(nomes: string[]): string[] {
	if (nomes.length < 2) return nomes;

	let prefixo = nomes[0];
	for (const n of nomes.slice(1)) {
		let i = 0;
		while (i < prefixo.length && i < n.length && prefixo[i] === n[i]) i++;
		prefixo = prefixo.slice(0, i);
	}

	const corte = prefixo.lastIndexOf(' - ');
	if (corte < 0) return nomes;
	const quantos = corte + ' - '.length;
	const curtos = nomes.map((n) => n.slice(quantos).trim());
	return curtos.some((c) => c === '') ? nomes : curtos;
}
