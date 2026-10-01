<script lang="ts">
	import Cronologia from '$lib/Cronologia.svelte';
	import Emblema from '$lib/Emblema.svelte';
	import FichaEquipas from '$lib/FichaEquipas.svelte';
	import Bola from '$lib/Bola.svelte';
	import { dataCurta, horaCurta } from '$lib/formato';

	let { data } = $props();
	const f = $derived(data.ficha);

	type Tab = 'cronologia' | 'ficha';
	let tab = $state<Tab>('cronologia');

	// W3.6d: sem acontecimentos reais, a tab de cronologia seria um ecrã vazio
	const ESTRUTURA = new Set(['inicio_parte', 'fim_parte', 'fim_jogo', 'por_iniciar']);
	const temCronologia = $derived(f.cronologia.some((e) => !ESTRUTURA.has(e.tipo)));
	const temFicha = $derived(f.equipas.some((e) => e.jogadores.length > 0));

	/** W7.2: marcadores por equipa, com minuto — vê-se quem marcou sem abrir a cronologia. */
	const marcadores = $derived.by(() => {
		const por = { casa: [] as string[], fora: [] as string[] };
		for (const e of f.cronologia) {
			if (e.tipo !== 'golo' || !e.jogador) continue;
			const rotulo = `${e.jogador}${e.minuto !== null ? ` ${e.minuto}'` : ''}`;
			if (e.equipa === f.casa) por.casa.push(rotulo);
			else if (e.equipa === f.fora) por.fora.push(rotulo);
		}
		return por;
	});
	const temMarcadores = $derived(marcadores.casa.length + marcadores.fora.length > 0);

	/** A fonte repete o escalão no nome da prova ("TAÇA ... - SENIORES MASCULINOS"), e na
	 *  migalha isso aparecia duas vezes seguidas. */
	const provaCurta = $derived.by(() => {
		const nome = f.grupo_nome ?? f.competicao ?? '';
		const cat = f.categoria;
		if (!cat) return nome;
		return nome.replace(new RegExp(`\\s*[-·]\\s*${cat}\\s*$`, 'i'), '').trim() || nome;
	});

	const migalhas = $derived(
		[f.categoria, provaCurta, f.serie ? `Série ${f.serie}` : null, f.jornada].filter(Boolean)
	);
</script>

<svelte:head><title>{f.casa} {f.golos_casa}–{f.golos_fora} {f.fora}</title></svelte:head>

<a class="voltar" href="/">← Jogos</a>

<article class="cabecalho">
	<div class="placar">
		<span class="equipa" class:venceu={(f.golos_casa ?? 0) > (f.golos_fora ?? 0)}>
			<Emblema equipa={f.casa} src={data.emblemas[f.casa]} tamanho={30} />
			<span class="nome">{f.casa}</span>
		</span>
		<span class="numeros">{f.golos_casa}<span class="tr">–</span>{f.golos_fora}</span>
		<span class="equipa" class:venceu={(f.golos_fora ?? 0) > (f.golos_casa ?? 0)}>
			<Emblema equipa={f.fora} src={data.emblemas[f.fora]} tamanho={30} />
			<span class="nome">{f.fora}</span>
		</span>
	</div>

	{#if temMarcadores}
		<div class="marcadores">
			<ul>{#each marcadores.casa as m (m)}<li>{m}</li>{/each}</ul>
			<Bola tamanho={13} />
			<ul class="dir">{#each marcadores.fora as m (m)}<li>{m}</li>{/each}</ul>
		</div>
	{/if}

	<p class="meta">
		{dataCurta(f.data)}{#if f.hora}, {horaCurta(f.hora)}{/if}
		{#if f.recinto} · {f.recinto}{/if}
	</p>
	{#if f.faltas[0] !== null}
		<p class="meta">Faltas de equipa: {f.faltas[0]}–{f.faltas[1]}</p>
	{/if}
	{#if f.arbitros.length}<p class="meta">Arbitragem: {f.arbitros.join(', ')}</p>{/if}
</article>

<!-- W7.3: dá caminho de volta à competição, que antes não existia no detalhe -->
<a class="migalhas" href={f.grupo_id ? `/competicoes/${f.grupo_id}` : '/competicoes'}>
	<span class="trilho">
		{#each migalhas as m, i (m)}{#if i}<span class="sep">›</span>{/if}<span class:escalao={i === 0}>{m}</span>{/each}
	</span>
	<span class="seta" aria-hidden="true">›</span>
</a>

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
		<Cronologia eventos={f.cronologia} casa={f.casa} fora={f.fora}
		omitidos={f.individuais_omitidos ?? false} />
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
	.placar { display: grid; grid-template-columns: 1fr auto 1fr; align-items: start; gap: 0.6rem; }
	.equipa { display: flex; flex-direction: column; align-items: center; gap: 0.3rem;
		font-size: 0.8rem; min-width: 0; }
	.equipa .nome { overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
		max-width: 100%; }
	.marcadores { display: grid; grid-template-columns: 1fr auto 1fr; gap: 0.5rem;
		align-items: start; margin-top: 0.7rem; }
	.marcadores ul { list-style: none; margin: 0; padding: 0; text-align: right;
		font-size: 0.72rem; color: var(--suave); }
	.marcadores ul.dir { text-align: left; }
	.migalhas { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;
		padding: 0.55rem 0.7rem; margin-bottom: 0.9rem; font-size: 0.72rem;
		text-decoration: none; border: 1px solid var(--borda); border-radius: 8px;
		background: var(--cartao); color: var(--suave); }
	.trilho { display: flex; flex-wrap: wrap; align-items: center; gap: 0.3rem; min-width: 0; }
	.trilho .escalao { color: var(--acento); font-weight: 600; }
	.sep { color: var(--borda); }
	.migalhas:hover, .migalhas:focus-visible { border-color: var(--acento); outline: none; }
	.seta { color: var(--suave); }
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
