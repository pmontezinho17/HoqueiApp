<script lang="ts">
	import type { Opcao } from './ligas';

	let { opcoes, valor = $bindable(null), rotulo, pequena = false }:
		{ opcoes: Opcao[]; valor?: string | null; rotulo: string; pequena?: boolean } = $props();
</script>

<div class="fita" class:pequena role="group" aria-label={rotulo}>
	{#each opcoes as o (o.valor ?? '')}
		<button type="button" class:ativo={valor === o.valor} aria-pressed={valor === o.valor}
			onclick={() => (valor = o.valor)}>
			{o.rotulo}<span class="n">{o.n}</span>
		</button>
	{/each}
</div>

<style>
	.fita { display: flex; gap: 0.35rem; overflow-x: auto; scrollbar-width: none;
		padding: 0.1rem 0 0.45rem; }
	.fita::-webkit-scrollbar { display: none; }
	button { flex: 0 0 auto; display: inline-flex; align-items: center; gap: 0.3rem;
		font: inherit; font-size: 0.74rem; font-weight: 600; color: var(--texto);
		background: var(--cartao, transparent); border: 1px solid var(--borda);
		border-radius: 999px; padding: 0.3rem 0.7rem; cursor: pointer; white-space: nowrap; }
	.pequena button { font-size: 0.68rem; padding: 0.22rem 0.6rem; font-weight: 500; }
	button.ativo { background: var(--acento); border-color: var(--acento); color: var(--fundo); }
	.n { font-size: 0.62rem; font-weight: 500; opacity: 0.75; }
</style>
