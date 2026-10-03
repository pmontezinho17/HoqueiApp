<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Folha from './Folha.svelte';
	import type { Competicao } from './tipos';

	let { competicoes, escolhida }: { competicoes: Competicao[]; escolhida: Competicao } = $props();

	let aberta = $state(false);
	let procura = $state('');
	let campo = $state<HTMLInputElement | null>(null);

	// sem isto o teclado do telemóvel não aparece e a folha parece morta
	$effect(() => {
		if (aberta) campo?.focus();
	});

	const normal = (s: string) =>
		s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

	const porEscalao = $derived.by(() => {
		const q = normal(procura.trim());
		const grupos = new Map<string, Competicao[]>();
		for (const c of competicoes) {
			if (q && !normal(`${c.categoria} ${c.nome}`).includes(q)) continue;
			(grupos.get(c.categoria) ?? grupos.set(c.categoria, []).get(c.categoria)!).push(c);
		}
		return [...grupos];
	});

	function escolher(c: Competicao) {
		aberta = false;
		procura = '';
		goto(`${page.url.pathname}?comp=${c.id}`, { invalidateAll: true });
	}
</script>

<button class="atual" onclick={() => (aberta = true)}>
	<span class="escalao">{escolhida.categoria}</span>
	<span class="nome">{escolhida.nome}</span>
	<span class="seta" aria-hidden="true">▾</span>
</button>

<Folha bind:aberta titulo="Escolher competição">
	<input
		bind:this={campo} type="search" bind:value={procura} placeholder="Procurar escalão ou prova"
		aria-label="Procurar competição"
	/>
	{#each porEscalao as [escalao, lista] (escalao)}
		<h3>{escalao}</h3>
		{#each lista as c (c.id)}
			<button class="opcao" class:activa={c.id === escolhida.id} onclick={() => escolher(c)}>
				{c.nome}
			</button>
		{/each}
	{/each}
	{#if porEscalao.length === 0}
		<p class="nada">Nada encontrado para “{procura}”.</p>
	{/if}
</Folha>

<style>
	.atual {
		width: 100%; margin-top: 0.6rem; min-height: 44px;
		display: grid; grid-template-columns: 1fr auto; align-items: center;
		gap: 0 0.5rem; padding: 0.45rem 0.7rem; cursor: pointer; text-align: left;
		border-radius: 8px; border: 1px solid var(--borda);
		background: var(--cartao); color: inherit;
	}
	.escalao { grid-column: 1; font-size: 0.68rem; text-transform: uppercase;
		letter-spacing: 0.05em; color: var(--acento); font-weight: 600; }
	.nome { grid-column: 1; font-size: 0.86rem; overflow: hidden;
		text-overflow: ellipsis; white-space: nowrap; }
	.seta { grid-row: 1 / 3; grid-column: 2; color: var(--suave); }

	input {
		width: 100%; padding: 0.6rem 0.7rem; margin: 0.2rem 0 0.8rem; font-size: 1rem;
		border-radius: 8px; border: 1px solid var(--borda);
		background: var(--cartao); color: inherit;
	}
	h3 { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.06em;
		color: var(--suave); margin: 0.9rem 0 0.35rem; }
	.opcao {
		display: block; width: 100%; text-align: left; min-height: 44px;
		padding: 0.6rem 0.7rem; margin-bottom: 0.3rem; font-size: 0.85rem; cursor: pointer;
		border-radius: 8px; border: 1px solid var(--borda);
		background: var(--cartao); color: inherit;
	}
	.opcao.activa { border-color: var(--acento); color: var(--acento); font-weight: 600; }
	.nada { color: var(--suave); font-size: 0.85rem; }
</style>
