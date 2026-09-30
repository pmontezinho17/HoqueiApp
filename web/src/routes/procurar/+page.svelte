<script lang="ts">
	import Emblema from '$lib/Emblema.svelte';
	import { favoritos } from '$lib/favoritos.svelte';
	import type { EquipaIndice } from '$lib/tipos';

	let { data } = $props();
	let procura = $state('');
	let campo = $state<HTMLInputElement | null>(null);

	$effect(() => campo?.focus());

	const normal = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
	const achadas = $derived.by(() => {
		const q = normal(procura.trim());
		if (q.length < 2) return [];
		return (data.equipas as EquipaIndice[])
			.filter((e) => normal(`${e.equipa} ${e.categoria}`).includes(q))
			.slice(0, 60);
	});
</script>

<svelte:head><title>Procurar — Hóquei em Patins</title></svelte:head>

<input bind:this={campo} type="search" bind:value={procura}
	placeholder="Nome do clube" aria-label="Procurar clube" />

{#each achadas as e (e.equipa + e.categoria)}
	<div class="resultado">
		<Emblema equipa={e.equipa} src={data.emblemas[e.equipa]} tamanho={22} />
		<span class="quem">
			<span class="nome">{e.equipa}</span>
			<span class="cat">{e.categoria}</span>
		</span>
		<button
			class:segue={favoritos.segue(e.equipa, e.categoria)}
			onclick={() => favoritos.alternar(e.equipa, e.categoria, e.competicoes)}
			aria-label={favoritos.segue(e.equipa, e.categoria) ? 'Deixar de seguir' : 'Seguir'}
		>{favoritos.segue(e.equipa, e.categoria) ? '✓ A seguir' : '+ Seguir'}</button>
	</div>
{/each}

{#if procura.trim().length >= 2 && achadas.length === 0}
	<p class="nada">Nenhum clube encontrado para “{procura}”.</p>
{:else if procura.trim().length < 2}
	<p class="nada">Escreve pelo menos duas letras — por exemplo “parede” ou “benfica”.</p>
{/if}

<style>
	input { width: 100%; padding: 0.6rem 0.7rem; margin-bottom: 0.8rem; font-size: 0.9rem;
		border-radius: 8px; border: 1px solid var(--borda);
		background: var(--cartao); color: inherit; }
	.resultado { display: grid; grid-template-columns: auto 1fr auto; align-items: center;
		gap: 0.5rem; padding: 0.45rem 0.2rem; border-bottom: 1px solid var(--borda); }
	.quem { min-width: 0; }
	.nome { display: block; font-size: 0.82rem; overflow: hidden;
		text-overflow: ellipsis; white-space: nowrap; }
	.cat { display: block; font-size: 0.66rem; color: var(--suave); }
	button { min-height: 36px; padding: 0.25rem 0.6rem; font-size: 0.7rem; cursor: pointer;
		white-space: nowrap; border-radius: 999px; border: 1px solid var(--borda);
		background: none; color: var(--suave); }
	button.segue { border-color: var(--acento); color: var(--acento); font-weight: 600; }
	.nada { color: var(--suave); font-size: 0.8rem; }
</style>
