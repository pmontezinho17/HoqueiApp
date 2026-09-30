<script lang="ts">
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

	// W2.6: abrir posicionado na jornada em curso
	$effect(() => {
		data.escolhida.id;
		document.getElementById('jornada-atual')?.scrollIntoView({ block: 'center' });
	});
</script>

<svelte:head><title>{data.escolhida.nome} — Hóquei em Patins</title></svelte:head>

{#if data.dados.jogos.length === 0}
	<p class="vazio">Esta competição ainda não tem jogos publicados.</p>
{:else}
	{#each [...porJornada] as [jornada, jogos] (jornada)}
		<section id={jornada === atual ? 'jornada-atual' : undefined}>
			<h2 class:destaque={jornada === atual}>
				{jornada}{#if jornada === atual}<span class="agora">em curso</span>{/if}
			</h2>
			{#each porQuando(jogos) as jogo (jogo.id ?? `${jogo.casa}-${jogo.fora}`)}
				<JogoLinha {jogo} comp={data.escolhida.id} />
			{/each}
		</section>
	{/each}
{/if}

<style>
	section { margin-bottom: 1.4rem; }
	h2 { font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.06em;
		color: var(--suave); margin: 0 0 0.5rem; font-weight: 600; }
	h2.destaque { color: var(--acento); }
	.agora { margin-left: 0.5rem; padding: 0.1rem 0.4rem; border-radius: 999px;
		background: var(--acento); color: var(--cartao); font-size: 0.68rem; }
	.vazio { color: var(--suave); font-size: 0.85rem; }
</style>
