/**
 * **Quantas partes teve o jogo, contadas na cronologia e não no boletim.**
 *
 * Apanhado por um treinador amigo do dono a 26/10/2026: nos Benjamins e nos Escolares joga-se
 * em quatro partes, e o separador de Informações mostrava duas. O treinador avisou também
 * que na Taça APL os sub-13 e os sub-15 jogam igualmente quatro.
 *
 * O ecrã não inventava as duas partes: copiava o boletim oficial, e **o boletim da APL só
 * tem duas casas**. Num jogo de quatro partes, a "1ª parte" do boletim é a soma das partes 1
 * e 2, e a "2ª parte" a soma da 3 e da 4. As quatro partes estão na cronologia jogada a
 * jogada, que a APL publica no mesmo jogo, e cada golo e cada falta de equipa trazem a parte
 * em que aconteceram.
 *
 * Medido a 26/10/2026 nos 479 jogos publicados: 86 têm quatro partes na cronologia (39 de
 * Benjamins, 44 de Escolares e 3 de Torneios Particulares), todos os outros têm duas. Dos 86,
 * 82 têm boletim, e **nos 82** os golos da cronologia, somados aos pares, dão exactamente os
 * parciais do boletim e o resultado final — e as faltas de equipa também.
 *
 * Por isso a regra não tem lista de escalões: **conta-se o que a cronologia diz.** Quando a
 * Taça chegar com sub-13 em quatro partes, aparecem quatro sem mexer em nada. E só se troca o
 * boletim pela cronologia quando as contas batem — se um dia não baterem, fica o boletim, que é
 * o documento oficial, e não um número nosso que o contradiz.
 */
import type { Boletim, EventoJogo, Parcial } from './tipos';

export type BoletimPorPartes = Boletim & {
	/**
	 * Quantas partes do jogo cabem em cada metade do boletim: 1 no caso normal, 2 num jogo de
	 * quatro partes. As horas de início e fim do boletim são por metade, e o ecrã precisa disto
	 * para não chamar "1ª parte" ao que foram as partes 1 e 2.
	 */
	partesPorMetade: number;
};

const FINAL = 'Resultado final';

/** O número de partes que a cronologia regista, ou 0 se não tiver nenhuma. */
export function partesNaCronologia(cronologia: EventoJogo[]): number {
	return cronologia.reduce((n, e) => Math.max(n, e.parte ?? 0), 0);
}

/** Conta golos ou faltas de equipa por parte, `[casa, fora]` em cada; `null` se houver um de quem não se sabe. */
function contarPorParte(
	cronologia: EventoJogo[],
	tipo: 'golo' | 'falta_equipa',
	partes: number,
	casa: string,
	fora: string
): [number, number][] | null {
	const contas = Array.from({ length: partes }, () => [0, 0] as [number, number]);
	for (const e of cronologia) {
		if (e.tipo !== tipo) continue;
		const lado = e.equipa === casa ? 0 : e.equipa === fora ? 1 : null;
		if (lado === null || !e.parte || e.parte > partes) return null;
		contas[e.parte - 1][lado]++;
	}
	return contas;
}

/** Soma as partes aos grupos de `k`: as quatro partes em duas metades, como as conta o boletim. */
function emMetades(contas: [number, number][], k: number): [number, number][] {
	const metades: [number, number][] = [];
	for (let i = 0; i < contas.length; i += k) {
		const grupo = contas.slice(i, i + k);
		metades.push([grupo.reduce((s, c) => s + c[0], 0), grupo.reduce((s, c) => s + c[1], 0)]);
	}
	return metades;
}

/**
 * O boletim com tantas partes quantas o jogo teve. Função pura.
 *
 * Devolve o boletim tal como veio, com `partesPorMetade: 1`, sempre que não houver mais partes
 * na cronologia do que no boletim, ou quando as contas não baterem.
 */
export function boletimPorPartes(
	boletim: Boletim,
	cronologia: EventoJogo[],
	casa: string,
	fora: string
): BoletimPorPartes {
	const tal = { ...boletim, partesPorMetade: 1 };
	const metades = boletim.parciais.filter((p) => p.nome !== FINAL);
	const partes = partesNaCronologia(cronologia);
	if (!metades.length || partes <= metades.length || partes % metades.length) return tal;
	const k = partes / metades.length;

	const golos = contarPorParte(cronologia, 'golo', partes, casa, fora);
	if (!golos) return tal;
	const batem = emMetades(golos, k).every(
		([c, f], i) => c === metades[i].casa && f === metades[i].fora
	);
	if (!batem) return tal;

	// As faltas só se trocam se o boletim as tiver e elas também baterem. Sem isso ficam as do
	// boletim, e um jogo pode mostrar os golos em quatro partes e as faltas em duas — é feio,
	// mas é verdade, e o contrário seria escrever números que ninguém publicou.
	let faltas_casa = boletim.faltas_casa;
	let faltas_fora = boletim.faltas_fora;
	const faltas = contarPorParte(cronologia, 'falta_equipa', partes, casa, fora);
	if (faltas && faltas_casa.length === metades.length && faltas_fora.length === metades.length) {
		const somadas = emMetades(faltas, k);
		if (somadas.every(([c, f], i) => c === faltas_casa[i] && f === faltas_fora[i])) {
			faltas_casa = faltas.map((c) => c[0]);
			faltas_fora = faltas.map((c) => c[1]);
		}
	}

	const parciais: Parcial[] = golos.map(([c, f], i) => ({
		nome: `${i + 1}ª parte`,
		casa: c,
		fora: f
	}));
	const final = boletim.parciais.find((p) => p.nome === FINAL);
	if (final) parciais.push(final);

	return { ...boletim, parciais, faltas_casa, faltas_fora, partesPorMetade: k };
}

/**
 * Uma metade do boletim nas horas de início e fim, já com o artigo: "da 1ª parte" no caso
 * normal, "das partes 1 e 2" quando o jogo teve quatro.
 */
export function daMetade(i: number, partesPorMetade: number): string {
	if (partesPorMetade === 1) return `da ${i + 1}ª parte`;
	const primeira = i * partesPorMetade + 1;
	const ultima = primeira + partesPorMetade - 1;
	return partesPorMetade === 2
		? `das partes ${primeira} e ${ultima}`
		: `das partes ${primeira} a ${ultima}`;
}
