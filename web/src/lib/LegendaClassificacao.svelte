<script lang="ts">
	let { completa = false }: { completa?: boolean } = $props();

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

<!-- Uma por ecrã, e não uma por tabela: numa competição com séries ela repetia-se por baixo de
     cada uma, e ao rolar o dono via-a sempre a subir — pediu-a só no fim a 31/10/2026. -->
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
	.legenda { margin-top: 0.6rem; font-size: 0.76rem; }
	summary { min-height: 44px; display: flex; align-items: center; cursor: pointer;
		color: var(--acento); font-size: 0.74rem; }
	.legenda dl { display: grid; grid-template-columns: 2.2rem 1fr; gap: 0.25rem 0.6rem;
		margin: 0.2rem 0 0.5rem; }
	.legenda dt { font-weight: 700; font-size: 0.72rem; }
	.legenda dd { margin: 0; font-size: 0.74rem; color: var(--suave); line-height: 1.4; }
	.legenda p { margin: 0; font-size: 0.7rem; color: var(--suave); line-height: 1.45; }
	.legenda code { font-family: inherit; font-weight: 700; }
</style>
