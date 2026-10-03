<script lang="ts">
	import Emblema from '$lib/Emblema.svelte';
	import { caminhoEquipa } from '$lib/slug';
	import type { LinhaClassificacao } from '$lib/tipos';

	let {
		linhas,
		emblemas,
		categoria,
		completa = false,
		destaque = () => false,
		assistencias = null
	}: {
		linhas: LinhaClassificacao[];
		emblemas: Record<string, string>;
		categoria: string;
		/** Completa acrescenta V/E/D e o rácio — as dez colunas da tabela oficial. */
		completa?: boolean;
		destaque?: (equipa: string) => boolean;
		/** Somadas das fichas; `null` quando a prova não tem fichas publicadas. */
		assistencias?: Map<string, number> | null;
	} = $props();

	/**
	 * A legenda existe porque o `title` de um `<abbr>` **não serve de nada num telemóvel**:
	 * só aparece ao passar o rato por cima, e num telefone não há rato. Pus dez abreviaturas
	 * numa tabela com a explicação escondida atrás de um gesto que não existe — e o primeiro
	 * utilizador a ver a vista Completa disse exactamente isso: "tem colunas que não entendo".
	 */
	const LEGENDA: [string, string][] = [
		['J', 'Jogos disputados'],
		['V', 'Vitórias'],
		['E', 'Empates'],
		['D', 'Derrotas'],
		['GM', 'Golos marcados'],
		['GS', 'Golos sofridos'],
		['DG', 'Diferença entre marcados e sofridos'],
		['R', 'Rácio: golos marcados a dividir pelos sofridos'],
		['A', 'Assistências — somadas das fichas de jogo, não vêm da tabela oficial'],
		['P', 'Pontos: 3 por vitória, 1 por empate']
	];
	const visiveis = $derived(
		completa ? LEGENDA : LEGENDA.filter(([s]) => !['V', 'E', 'D', 'R'].includes(s))
	);
</script>

<!-- Rola na horizontal com o lugar e o nome fixos: na vista completa são onze colunas, e
     sem isto perde-se de quem é a linha a meio do gesto. -->
<div class="rolo">
	<table>
		<thead>
			<tr>
				<th class="p" scope="col">#</th><th class="eq" scope="col">Equipa</th>
				<th scope="col"><abbr title="Jogos">J</abbr></th>
				{#if completa}
					<th scope="col"><abbr title="Vitórias">V</abbr></th>
					<th scope="col"><abbr title="Empates">E</abbr></th>
					<th scope="col"><abbr title="Derrotas">D</abbr></th>
				{/if}
				<th scope="col"><abbr title="Golos marcados">GM</abbr></th>
				<th scope="col"><abbr title="Golos sofridos">GS</abbr></th>
				<th scope="col"><abbr title="Diferença de golos">DG</abbr></th>
				{#if completa}
					<th scope="col"><abbr title="Rácio de golos (marcados / sofridos)">R</abbr></th>
				{/if}
				<th scope="col"><abbr title="Assistências">A</abbr></th>
				<th class="pts" scope="col"><abbr title="Pontos">P</abbr></th>
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
					{#if completa}
						<td>{l.vitorias}</td><td>{l.empates}</td><td>{l.derrotas}</td>
					{/if}
					<td>{l.golos_marcados}</td>
					<td>{l.golos_sofridos}</td>
					<td class:pos={l.diferenca > 0} class:neg={l.diferenca < 0}>
						{l.diferenca > 0 ? '+' : ''}{l.diferenca}
					</td>
					{#if completa}
						<!-- a fonte mostra "-" quando ainda não sofreu golos -->
						<td>{l.racio ?? '–'}</td>
					{/if}
					<td>{assistencias?.get(l.equipa) ?? '–'}</td>
					<td class="pts">{l.pontos}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<details class="legenda">
	<summary>O que significam as colunas</summary>
	<dl>
		{#each visiveis as [sigla, texto] (sigla)}
			<dt>{sigla}</dt><dd>{texto}</dd>
		{/each}
	</dl>
	<p>
		Um <code>–</code> na coluna das assistências é uma equipa sem fichas publicadas nesta
		prova, e não um zero.
	</p>
</details>

<style>
	/* a largura do lugar e o encosto do nome saem da MESMA medida: quando eram dois valores
	   independentes (1.4rem e 1.7rem) o nome assentava 11px por cima da coluna dos jogos */
	.rolo { --lugar: 2rem; overflow-x: auto; scrollbar-width: thin; }
	/* `separate` e não `collapse`: no Safari, uma célula `position: sticky` dentro de uma
	   tabela com `border-collapse: collapse` perde as bordas ao rolar — o fundo acompanha a
	   célula fixa mas as bordas colapsadas ficam com o conteúdo. As nossas bordas já estão
	   nas células (`border-top`), por isso o resultado desenhado é o mesmo.
	   https://bugs.webkit.org/show_bug.cgi?id=128486 */
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
	.legenda { margin-top: 0.6rem; font-size: 0.76rem; }
	summary { min-height: 44px; display: flex; align-items: center; cursor: pointer;
		color: var(--acento); font-size: 0.74rem; }
	.legenda dl { display: grid; grid-template-columns: 2.2rem 1fr; gap: 0.25rem 0.6rem;
		margin: 0.2rem 0 0.5rem; }
	.legenda dt { font-weight: 700; font-size: 0.72rem; }
	.legenda dd { margin: 0; font-size: 0.74rem; color: var(--suave); line-height: 1.4; }
	.legenda p { margin: 0; font-size: 0.7rem; color: var(--suave); line-height: 1.45; }
	.legenda code { font-family: inherit; font-weight: 700; }

	.pos { color: var(--acento); }
	.neg { color: var(--suave); }
</style>
