<script lang="ts">
	import { dataCurta, horaCurta } from './formato';
	import { disputado, type Jogo } from './tipos';

	let { jogo }: { jogo: Jogo } = $props();
	const jogado = $derived(disputado(jogo));
	const venceuCasa = $derived(jogado && jogo.golos_casa! > jogo.golos_fora!);
	const venceuFora = $derived(jogado && jogo.golos_fora! > jogo.golos_casa!);
</script>

<article>
	<div class="quando">
		<span>{dataCurta(jogo.data)}</span>
		<span class="hora">{horaCurta(jogo.hora)}</span>
	</div>
	<div class="equipas">
		<span class:vencedor={venceuCasa}>{jogo.casa}</span>
		<span class:vencedor={venceuFora}>{jogo.fora}</span>
	</div>
	<div class="resultado">
		{#if jogado}
			<span class:vencedor={venceuCasa}>{jogo.golos_casa}</span>
			<span class:vencedor={venceuFora}>{jogo.golos_fora}</span>
		{:else}
			<span class="porjogar" aria-label="por disputar">–</span>
		{/if}
	</div>
	{#if jogo.recinto}<div class="recinto">{jogo.recinto}</div>{/if}
</article>

<style>
	article {
		display: grid;
		grid-template-columns: 5.2rem 1fr auto;
		grid-template-areas: 'quando equipas resultado' '. recinto recinto';
		gap: 0.15rem 0.7rem;
		padding: 0.65rem 0.75rem;
		background: var(--cartao);
		border: 1px solid var(--borda);
		border-radius: 10px;
		margin-bottom: 0.4rem;
	}
	.quando { grid-area: quando; font-size: 0.72rem; color: var(--suave);
		display: flex; flex-direction: column; }
	.hora { font-variant-numeric: tabular-nums; }
	.equipas { grid-area: equipas; display: flex; flex-direction: column; gap: 0.15rem;
		font-size: 0.92rem; min-width: 0; }
	.equipas span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.resultado { grid-area: resultado; display: flex; flex-direction: column; gap: 0.15rem;
		text-align: right; font-variant-numeric: tabular-nums; font-size: 0.92rem; }
	.vencedor { font-weight: 700; }
	.porjogar { color: var(--suave); }
	.recinto { grid-area: recinto; font-size: 0.7rem; color: var(--suave);
		overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
