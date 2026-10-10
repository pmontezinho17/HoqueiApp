<script lang="ts">
	/**
	 * A tabela de Mérito da Formação — o Artigo 92.º do regulamento da APL.
	 *
	 * **Só a tabela.** O que ela quer dizer vive no `ChapeuMerito`, acima, e as regras no
	 * `LegendaMerito`, abaixo — uma vez por ecrã e não uma vez por série. Com três séries de
	 * Escolares no mesmo ecrã, tê-los aqui dentro dava o mesmo parágrafo três vezes
	 * empilhado, que é precisamente o que já tinha corrido mal com o aviso da classificação
	 * calculada.
	 */
	import Emblema from '$lib/Emblema.svelte';
	import { caminhoEquipa } from '$lib/slug';
	import type { LinhaMerito } from '$lib/tipos';

	let {
		linhas,
		emblemas,
		categoria,
		destaque = () => false
	}: {
		linhas: LinhaMerito[];
		emblemas: Record<string, string>;
		categoria: string;
		destaque?: (equipa: string) => boolean;
	} = $props();
</script>

<div class="rolo">
	<table>
		<thead>
			<tr>
				<th class="p" scope="col">#</th><th class="eq" scope="col">Equipa</th>
				<th scope="col"><abbr title="Jogos">J</abbr></th>
				<th scope="col"><abbr title="Bonificações">B</abbr></th>
				<th scope="col"><abbr title="Penalizações">Pen</abbr></th>
				<th scope="col"><abbr title="Pontos por jogo">Méd</abbr></th>
				<th class="pts" scope="col"><abbr title="Pontos de mérito">P</abbr></th>
			</tr>
		</thead>
		<tbody>
			{#each linhas as l (l.equipa)}
				<tr class:minha={destaque(l.equipa)}>
					<td class="p">{l.posicao}</td>
					<th class="eq" scope="row">
						<a href={caminhoEquipa(l.equipa, categoria)}>
							<Emblema equipa={l.equipa} src={emblemas[l.equipa]} tamanho={18} />{l.equipa}
						</a>
					</th>
					<td>{l.jogos}</td>
					<td>{l.bonificacao}</td>
					<!-- um zero é melhor do que um "0" cinzento perdido: aqui zero é bom -->
					<td class:neg={l.penalizacao < 0}>{l.penalizacao === 0 ? '–' : l.penalizacao}</td>
					<td>{l.media.toFixed(1)}</td>
					<td class="pts">{l.pontos}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.rolo { --lugar: 2rem; overflow-x: auto; scrollbar-width: thin; }
	/* as mesmas razões de `TabelaClassificacao`: `separate` por causa do sticky no Safari,
	   e a largura do lugar partilhada entre a coluna e o encosto do nome */
	table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 0.76rem;
		font-variant-numeric: tabular-nums; }
	th, td { box-sizing: border-box; padding: 0.4rem 0.3rem; text-align: right;
		white-space: nowrap; }
	thead th { font-size: 0.64rem; color: var(--suave); font-weight: 600;
		border-bottom: 1px solid var(--borda); }
	abbr { text-decoration: none; }
	.p { position: sticky; left: 0; z-index: 1; text-align: center; color: var(--suave);
		background: var(--fundo);
		width: var(--lugar); min-width: var(--lugar); max-width: var(--lugar); }
	.eq { position: sticky; left: var(--lugar); z-index: 1; text-align: left;
		font-weight: 400; background: var(--fundo); }
	.eq a { display: flex; align-items: center; gap: 0.35rem; text-decoration: none; }
	.pts { font-weight: 700; padding-left: 0.5rem; }
	tbody tr + tr th, tbody tr + tr td { border-top: 1px solid var(--borda); }
	tbody tr.minha > * { background: var(--acento-fraco); }
	tbody tr.minha .eq { font-weight: 600; }
	.neg { color: var(--suave); }

</style>
