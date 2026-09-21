<script lang="ts">
	import { goto } from '$app/navigation';
	import JogoLinha from '$lib/JogoLinha.svelte';
	import { jornadaAtual, porQuando } from '$lib/formato';
	import type { Jogo } from '$lib/tipos';

	let { data } = $props();

	const porJornada = $derived(
		data.dados.jogos.reduce((acc: Map<string, Jogo[]>, j: Jogo) => {
			(acc.get(j.jornada) ?? acc.set(j.jornada, []).get(j.jornada)!).push(j);
			return acc;
		}, new Map<string, Jogo[]>())
	);
	const atual = $derived(jornadaAtual(data.dados.jogos));

	// W2.6: abrir posicionado na jornada em curso, sem animação a saltar à frente dos olhos
	$effect(() => {
		document.getElementById('jornada-atual')?.scrollIntoView({ block: 'start' });
	});

	function mudar(e: Event) {
		goto(`?comp=${(e.target as HTMLSelectElement).value}`, { invalidateAll: true });
	}
</script>

<svelte:head><title>{data.escolhida.nome} — Hóquei</title></svelte:head>

<header>
	<h1>Hóquei em Patins</h1>
	<select onchange={mudar} value={String(data.escolhida.id)} aria-label="Competição">
		{#each data.indice.competicoes as c (c.id)}
			<option value={String(c.id)}>{c.categoria} · {c.nome}</option>
		{/each}
	</select>
</header>

{#if data.dados.jogos.length === 0}
	<p class="vazio">Esta competição ainda não tem jogos publicados.</p>
{:else}
	{#each [...porJornada] as [jornada, jogos] (jornada)}
		<section id={jornada === atual ? 'jornada-atual' : undefined}>
			<h2 class:destaque={jornada === atual}>
				{jornada}{#if jornada === atual}<span class="agora">em curso</span>{/if}
			</h2>
			{#each porQuando(jogos) as jogo (jogo.id ?? `${jogo.casa}-${jogo.fora}`)}
				<JogoLinha {jogo} />
			{/each}
		</section>
	{/each}
{/if}

<footer>
	Dados: Associação de Patinagem de Lisboa / Federação de Patinagem de Portugal
</footer>

<style>
	header { display: flex; flex-direction: column; gap: 0.6rem; margin-bottom: 1.2rem; }
	h1 { font-size: 1.3rem; margin: 0; }
	select { width: 100%; padding: 0.6rem; font-size: 0.95rem; border-radius: 8px;
		border: 1px solid var(--borda); background: var(--cartao); color: inherit; }
	section { margin-bottom: 1.4rem; }
	h2 { font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.06em;
		color: var(--suave); margin: 0 0 0.5rem; font-weight: 600; }
	h2.destaque { color: var(--acento); }
	.agora { margin-left: 0.5rem; padding: 0.1rem 0.4rem; border-radius: 999px;
		background: var(--acento); color: var(--cartao); font-size: 0.68rem; }
	.vazio, footer { color: var(--suave); font-size: 0.85rem; }
	footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid var(--borda); }
</style>
