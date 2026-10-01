import { disputado, type Jogo } from './tipos';

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
