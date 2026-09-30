<script lang="ts">
	import Emblema from '$lib/Emblema.svelte';

	let { data } = $props();
	const grupos = $derived(data.dados.classificacao);
</script>

<svelte:head><title>Classificação — {data.escolhida.nome}</title></svelte:head>

{#if grupos.length === 0}
	<p class="vazio">Esta competição não tem classificação publicada.</p>
{:else}
	{#each grupos as grupo, i (grupo.nome ?? i)}
		<section>
			{#if grupo.nome}<h2>{grupo.nome}</h2>{/if}
			<div class="rolo">
				<table>
					<caption class="sr">Classificação{grupo.nome ? ` do ${grupo.nome}` : ''}</caption>
					<thead>
						<tr>
							<th class="pos" scope="col"><abbr title="Posição">#</abbr></th>
							<th class="eq" scope="col">Equipa</th>
							<th scope="col"><abbr title="Jogos jogados">J</abbr></th>
							<th scope="col"><abbr title="Vitórias">V</abbr></th>
							<th scope="col"><abbr title="Empates">E</abbr></th>
							<th scope="col"><abbr title="Derrotas">D</abbr></th>
							<th scope="col"><abbr title="Golos marcados">GM</abbr></th>
							<th scope="col"><abbr title="Golos sofridos">GS</abbr></th>
							<th scope="col"><abbr title="Diferença de golos">DG</abbr></th>
							<th class="tp" scope="col"><abbr title="Total de pontos">P</abbr></th>
						</tr>
					</thead>
					<tbody>
						{#each grupo.linhas as l (l.equipa)}
							<tr>
								<td class="pos">{l.posicao}</td>
								<th class="eq" scope="row">
									<Emblema equipa={l.equipa} src={data.emblemas[l.equipa]} tamanho={20} />{l.equipa}
								</th>
								<td>{l.jogos}</td><td>{l.vitorias}</td><td>{l.empates}</td><td>{l.derrotas}</td>
								<td>{l.golos_marcados}</td><td>{l.golos_sofridos}</td>
								<td class:pos-dg={l.diferenca > 0} class:neg-dg={l.diferenca < 0}>
									{l.diferenca > 0 ? '+' : ''}{l.diferenca}
								</td>
								<td class="tp">{l.pontos}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/each}
	<p class="nota">Vitória 3 pontos, empate 1.</p>
{/if}

<style>
	section { margin-bottom: 1.5rem; }
	h2 { font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.06em;
		color: var(--suave); margin: 0 0 0.5rem; font-weight: 600; }
	/* a tabela tem 10 colunas: num telemóvel rola só ela, nunca a página (W2.7) */
	.rolo { overflow-x: auto; -webkit-overflow-scrolling: touch;
		background: var(--cartao); border: 1px solid var(--borda); border-radius: 10px; }
	table { width: 100%; border-collapse: collapse; font-size: 0.82rem;
		font-variant-numeric: tabular-nums; }
	th, td { padding: 0.5rem 0.35rem; text-align: right; white-space: nowrap; }
	thead th { font-size: 0.7rem; color: var(--suave); font-weight: 600;
		border-bottom: 1px solid var(--borda); }
	abbr { text-decoration: none; border: 0; }
	.pos { width: 1.6rem; text-align: center; color: var(--suave); }
	.eq { text-align: left; width: 100%; font-weight: 500; position: sticky; left: 0;
		background: var(--cartao); }
	tbody .eq { display: flex; align-items: center; gap: 0.4rem; }
	.tp { font-weight: 700; padding-right: 0.7rem; }
	tbody tr + tr th, tbody tr + tr td { border-top: 1px solid var(--borda); }
	.pos-dg { color: var(--acento); }
	.neg-dg { color: var(--suave); }
	.nota, .vazio { color: var(--suave); font-size: 0.76rem; }
	.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
</style>
