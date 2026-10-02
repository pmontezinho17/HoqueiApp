<script lang="ts">
	import type { Competicao } from '$lib/tipos';

	let { data } = $props();

	const ORDEM = ['SENIORES MASCULINOS', 'SENIORES FEMININOS', 'SUB-23', 'SUB-19',
		'SUB-17', 'SUB-15', 'SUB-13', 'ESCOLARES', 'BENJAMINS', 'BAMBIS'];

	/** Uma entrada por grupo, não por série: 37 competições viram 20 entradas. */
	const grupos = $derived.by(() => {
		const m = new Map<string, { nome: string; cat: string; series: string[] }>();
		for (const c of data.indice.competicoes as Competicao[]) {
			const id = c.grupo_id ?? String(c.id);
			const g = m.get(id) ?? m.set(id, {
				nome: c.grupo_nome ?? c.nome, cat: c.categoria, series: []
			}).get(id)!;
			if (c.serie) g.series.push(c.serie);
		}
		const lista = [...m].map(([id, g]) => ({ id, ...g, series: g.series.sort() }));
		const porEscalao = new Map<string, typeof lista>();
		for (const g of lista) (porEscalao.get(g.cat) ?? porEscalao.set(g.cat, []).get(g.cat)!).push(g);
		return [...porEscalao].sort((a, b) => {
			const ia = ORDEM.indexOf(a[0]), ib = ORDEM.indexOf(b[0]);
			return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a[0].localeCompare(b[0]);
		});
	});
</script>

<svelte:head><title>Competições — Hóquei em Patins</title></svelte:head>

<h1 class="sr">Competições</h1>

{#each grupos as [escalao, lista] (escalao)}
	<section>
		<h2>{escalao}</h2>
		{#each lista as g (g.id)}
			<a class="prova" href={`/competicoes/${g.id}`}>
				<span class="nome">{g.nome}</span>
				{#if g.series.length}
					<span class="series">{g.series.length} séries · {g.series.join(' ')}</span>
				{/if}
			</a>
		{/each}
	</section>
{/each}

<style>
	section { margin-bottom: 1.2rem; }
	h2 { font-size: 0.64rem; color: var(--acento); letter-spacing: 0.05em;
		margin: 0 0 0.3rem; font-weight: 600; }
	.prova { display: block; padding: 0.55rem 0.2rem; text-decoration: none;
		border-bottom: 1px solid var(--borda); }
	.prova:hover, .prova:focus-visible { background: var(--acento-fraco); outline: none; }
	.nome { display: block; font-size: 0.85rem; }
	.series { display: block; font-size: 0.68rem; color: var(--suave); margin-top: 0.1rem; }
</style>
