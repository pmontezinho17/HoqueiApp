<script lang="ts">
	import Cronologia from '$lib/Cronologia.svelte';
	import FichaEquipas from '$lib/FichaEquipas.svelte';
	import { dataCurta, horaCurta } from '$lib/formato';

	let { data } = $props();
	const f = $derived(data.ficha);

	type Tab = 'cronologia' | 'ficha';
	let tab = $state<Tab>('cronologia');

	// W3.6d: sem acontecimentos reais, a tab de cronologia seria um ecrã vazio
	const ESTRUTURA = new Set(['inicio_parte', 'fim_parte', 'fim_jogo', 'por_iniciar']);
	const temCronologia = $derived(f.cronologia.some((e) => !ESTRUTURA.has(e.tipo)));
	const temFicha = $derived(f.equipas.some((e) => e.jogadores.length > 0));
</script>

<svelte:head><title>{f.casa} {f.golos_casa}–{f.golos_fora} {f.fora}</title></svelte:head>

<a class="voltar" href={`/?comp=${f.competicao_id ?? ''}`}>← Jogos</a>

<article class="cabecalho">
	<p class="prova">{f.competicao ?? ''}</p>
	<div class="placar">
		<span class="equipa" class:venceu={(f.golos_casa ?? 0) > (f.golos_fora ?? 0)}>{f.casa}</span>
		<span class="numeros">{f.golos_casa}<span class="tr">–</span>{f.golos_fora}</span>
		<span class="equipa dir" class:venceu={(f.golos_fora ?? 0) > (f.golos_casa ?? 0)}>{f.fora}</span>
	</div>
	<p class="meta">
		{dataCurta(f.data)}{#if f.hora}, {horaCurta(f.hora)}{/if}
		{#if f.recinto} · {f.recinto}{/if}
	</p>
	{#if f.faltas[0] !== null}
		<p class="meta">Faltas de equipa: {f.faltas[0]}–{f.faltas[1]}</p>
	{/if}
	{#if f.arbitros.length}<p class="meta">Arbitragem: {f.arbitros.join(', ')}</p>{/if}
</article>

{#if temCronologia || temFicha}
	<div class="tabs" role="tablist">
		{#if temCronologia}
			<button role="tab" aria-selected={tab === 'cronologia'} onclick={() => (tab = 'cronologia')}>
				Cronologia
			</button>
		{/if}
		{#if temFicha}
			<button role="tab" aria-selected={tab === 'ficha'} onclick={() => (tab = 'ficha')}>
				Ficha
			</button>
		{/if}
	</div>

	{#if tab === 'cronologia' && temCronologia}
		<Cronologia eventos={f.cronologia} casa={f.casa} omitidos={f.individuais_omitidos ?? false} />
	{:else if temFicha}
		<FichaEquipas equipas={f.equipas} />
	{/if}
{:else}
	<p class="vazio">Este jogo não tem detalhe publicado.</p>
{/if}

<style>
	.voltar { display: inline-block; font-size: 0.82rem; color: var(--suave);
		text-decoration: none; margin-bottom: 0.8rem; min-height: 44px; line-height: 44px; }
	.cabecalho { background: var(--cartao); border: 1px solid var(--borda);
		border-radius: 12px; padding: 1rem 0.9rem; margin-bottom: 1rem; text-align: center; }
	.prova { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em;
		color: var(--suave); margin: 0 0 0.6rem; }
	.placar { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 0.6rem; }
	.equipa { font-size: 0.92rem; text-align: right; }
	.equipa.dir { text-align: left; }
	.venceu { font-weight: 700; }
	.numeros { font-size: 1.7rem; font-weight: 700; font-variant-numeric: tabular-nums; }
	.tr { color: var(--suave); margin: 0 0.25rem; font-weight: 400; }
	.meta { font-size: 0.74rem; color: var(--suave); margin: 0.5rem 0 0; }
	.tabs { display: flex; gap: 0.3rem; margin-bottom: 0.9rem; }
	.tabs button {
		flex: 1; min-height: 44px; padding: 0.5rem; font-size: 0.85rem; cursor: pointer;
		border-radius: 8px; border: 1px solid var(--borda);
		background: var(--cartao); color: var(--suave);
	}
	.tabs button[aria-selected='true'] { color: var(--acento); border-color: var(--acento);
		font-weight: 600; }
	.vazio { color: var(--suave); font-size: 0.85rem; }
</style>
