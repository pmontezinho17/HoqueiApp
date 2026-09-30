<script lang="ts">
	import Emblema from './Emblema.svelte';
	import type { JogoAgenda } from './tipos';

	let {
		jogo, emblemas, seguida
	}: {
		jogo: JogoAgenda;
		emblemas: Record<string, string>;
		seguida?: (equipa: string) => boolean;
	} = $props();

	const jogado = $derived(jogo.gc !== null && jogo.gf !== null);
	const ganhouCasa = $derived(jogado && jogo.gc! > jogo.gf!);
	const ganhouFora = $derived(jogado && jogo.gf! > jogo.gc!);
	const destino = $derived(jogado && jogo.id ? `/jogo/${jogo.id}` : null);
</script>

<!--
  Linha plana com separador de 1px, não cartão: medido contra a FotMob, o cartão
  (raio + borda + margem) punha a linha a 81,6px contra os 56px deles. E a competição
  vive no cabeçalho da secção, não repetida aqui — era a terceira linha de texto que
  custava 25px por jogo. Ver docs/04-benchmarking.md.
-->
<svelte:element this={destino ? 'a' : 'div'} href={destino} class="linha" class:ligavel={destino}>
	<span class="hora">{jogo.hora ?? '—'}</span>

	<span class="equipa casa" class:vencedor={ganhouCasa} class:minha={seguida?.(jogo.casa)}>
		<span class="nome">{jogo.casa}</span>
		<Emblema equipa={jogo.casa} src={emblemas[jogo.casa]} tamanho={18} />
	</span>

	<span class="meio">
		{#if jogado}
			<span class="placar"><b class:vencedor={ganhouCasa}>{jogo.gc}</b><i>–</i><b class:vencedor={ganhouFora}>{jogo.gf}</b></span>
		{:else}
			<span class="vs" aria-hidden="true">v</span>
		{/if}
	</span>

	<span class="equipa fora" class:vencedor={ganhouFora} class:minha={seguida?.(jogo.fora)}>
		<Emblema equipa={jogo.fora} src={emblemas[jogo.fora]} tamanho={18} />
		<span class="nome">{jogo.fora}</span>
	</span>
</svelte:element>

<style>
	.linha {
		display: grid;
		grid-template-columns: 2.6rem 1fr auto 1fr;
		align-items: center; gap: 0.45rem;
		padding: 0.5rem 0.2rem;
		border-bottom: 1px solid var(--borda);
		text-decoration: none; color: inherit;
		/* 12px como a referência: a hierarquia faz-se com peso e cor, não com tamanho */
		font-size: 0.75rem;
	}
	.ligavel:hover, .ligavel:focus-visible { background: var(--acento-fraco); outline: none; }

	.hora { color: var(--suave); font-variant-numeric: tabular-nums; font-size: 0.7rem; }

	.equipa { display: flex; align-items: center; gap: 0.35rem; min-width: 0; }
	.equipa.casa { justify-content: flex-end; text-align: right; }
	.nome { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.vencedor { font-weight: 700; }
	.minha .nome { color: var(--acento); font-weight: 600; }

	.meio { min-width: 2.4rem; text-align: center; }
	.placar { font-variant-numeric: tabular-nums; font-size: 0.82rem; }
	.placar i { color: var(--suave); font-style: normal; margin: 0 0.1rem; }
	.placar b { font-weight: 400; }
	.placar b.vencedor { font-weight: 700; }
	.vs { color: var(--suave); font-size: 0.68rem; }
</style>
