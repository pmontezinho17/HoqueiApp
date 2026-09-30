<script lang="ts">
	import Emblema from './Emblema.svelte';
	import { dataCurta, horaCurta } from './formato';
	import { disputado, type Jogo } from './tipos';

	let {
		jogo, comp, emblemas = {}
	}: { jogo: Jogo; comp: number; emblemas?: Record<string, string> } = $props();

	const jogado = $derived(disputado(jogo));
	const venceuCasa = $derived(jogado && jogo.golos_casa! > jogo.golos_fora!);
	const venceuFora = $derived(jogado && jogo.golos_fora! > jogo.golos_casa!);
	// só um jogo disputado tem ficha; os outros não têm para onde navegar
	const destino = $derived(jogado && jogo.id ? `/jogo/${jogo.id}?comp=${comp}` : null);
</script>

<svelte:element
	this={destino ? 'a' : 'div'}
	href={destino}
	class="jogo"
	class:ligavel={destino}
	aria-label={jogado
		? `${jogo.casa} ${jogo.golos_casa} ${jogo.fora} ${jogo.golos_fora}, ver ficha`
		: `${jogo.casa} contra ${jogo.fora}, por disputar`}
>
	<div class="quando">
		<span>{dataCurta(jogo.data)}</span>
		<span class="hora">{horaCurta(jogo.hora)}</span>
	</div>
	<div class="equipas">
		<span class:vencedor={venceuCasa}>
			<Emblema equipa={jogo.casa} src={emblemas[jogo.casa]} />{jogo.casa}
		</span>
		<span class:vencedor={venceuFora}>
			<Emblema equipa={jogo.fora} src={emblemas[jogo.fora]} />{jogo.fora}
		</span>
	</div>
	<div class="resultado">
		{#if jogado}
			<span class:vencedor={venceuCasa}>{jogo.golos_casa}</span>
			<span class:vencedor={venceuFora}>{jogo.golos_fora}</span>
		{:else}
			<span class="porjogar" aria-hidden="true">–</span>
		{/if}
	</div>
	{#if jogo.recinto}<div class="recinto">{jogo.recinto}</div>{/if}
</svelte:element>

<style>
	.jogo {
		display: grid;
		grid-template-columns: 5.2rem 1fr auto;
		grid-template-areas: 'quando equipas resultado' '. recinto recinto';
		gap: 0.15rem 0.7rem;
		padding: 0.65rem 0.75rem;
		background: var(--cartao); border: 1px solid var(--borda);
		border-radius: 10px; margin-bottom: 0.4rem;
		text-decoration: none; color: inherit;
	}
	.ligavel:hover, .ligavel:focus-visible { border-color: var(--acento); outline: none; }
	.quando { grid-area: quando; font-size: 0.72rem; color: var(--suave);
		display: flex; flex-direction: column; }
	.hora { font-variant-numeric: tabular-nums; }
	.equipas { grid-area: equipas; display: flex; flex-direction: column; gap: 0.15rem;
		font-size: 0.92rem; min-width: 0; }
	.equipas span { display: flex; align-items: center; gap: 0.4rem; min-width: 0; }
	.equipas span :global(img), .equipas span :global(.iniciais) { flex: 0 0 auto; }
	.resultado { grid-area: resultado; display: flex; flex-direction: column; gap: 0.15rem;
		text-align: right; font-variant-numeric: tabular-nums; font-size: 0.92rem; }
	.vencedor { font-weight: 700; }
	.porjogar { color: var(--suave); }
	.recinto { grid-area: recinto; font-size: 0.7rem; color: var(--suave);
		overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
