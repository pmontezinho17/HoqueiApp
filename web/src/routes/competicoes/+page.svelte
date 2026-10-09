<script lang="ts">
	/**
	 * O menu de Competições.
	 *
	 * **Por omissão mostra o que está a decorrer** (P12.1). Medido a 08/10/2026: das 20
	 * entradas, 9 não tinham um único jogo por disputar — Supertaças e Torneios de Abertura de
	 * setembro — e quem entrava à procura do escalão do filho tinha de os saltar todos.
	 *
	 * **O que se tira é contado e tem porta de entrada.** A 06/10 escondi escalões sem prova a
	 * decorrer no ecrã de escolha de equipas e o dono apanhou-me: as seniores do HC SINTRA
	 * desapareceram. Aqui o interruptor diz quantas estão escondidas, e cada linha que já
	 * acabou diz que acabou. A decisão vive em `lib/provas.ts`, com oito testes.
	 *
	 * Os crachás dos escalões vêm de P12.2: estavam em `static/escaloes/` desde 05/10 sem uso.
	 */
	import CrachaEscalao from '$lib/CrachaEscalao.svelte';
	import { competicoesVivas } from '$lib/clubes';
	import { agruparProvas, filtrarProvas } from '$lib/provas';
	import { APP_NOME } from '$lib/sitio';
	import type { Competicao } from '$lib/tipos';

	let { data } = $props();

	/** Sai da agenda que o `+layout.ts` já carregou: não custa um pedido. */
	const vivas = $derived(
		competicoesVivas(data.agenda as { comp: number; gc: number | null }[])
	);
	const tudo = $derived(agruparProvas(data.indice.competicoes as Competicao[], vivas));

	// **Liga-se sozinho quando nada está a decorrer.** Em fim de época, ou com uma agenda que
	// não se leu, um menu filtrado ficava vazio — e um ecrã vazio não é uma resposta.
	let pedido = $state(false);
	const mostrarTudo = $derived(pedido || tudo.nadaVivo);
	const lista = $derived(filtrarProvas(tudo.escaloes, mostrarTudo));
</script>

<svelte:head><title>Competições — {APP_NOME}</title></svelte:head>

<h1 class="sr">Competições</h1>

{#if tudo.nadaVivo}
	<p class="nota">Não há provas a decorrer. Em baixo está a época toda.</p>
{:else if tudo.terminadas}
	<button class="interruptor" onclick={() => (pedido = !pedido)} aria-pressed={pedido}>
		{pedido
			? 'mostrar só o que está a decorrer'
			: `mostrar também as ${tudo.terminadas} que já acabaram`}
	</button>
{/if}

{#each lista as [escalao, provas] (escalao)}
	<section>
		<h2><CrachaEscalao categoria={escalao} tamanho={14} />{escalao}</h2>
		{#each provas as g (g.id)}
			<a class="prova" href={`/competicoes/${g.id}`}>
				<span class="nome">
					{g.nome}
					{#if !g.viva}<em class="acabou">terminada</em>{/if}
				</span>
				{#if g.series.length}
					<span class="series">{g.series.length} séries · {g.series.join(' ')}</span>
				{/if}
			</a>
		{/each}
	</section>
{/each}

<style>
	section { margin-bottom: 1.2rem; }
	h2 { font-size: 0.64rem; color: var(--acento); letter-spacing: 0.05em;
		margin: 0 0 0.3rem; font-weight: 600;
		display: flex; align-items: center; gap: 0.3rem; }
	.prova { display: block; padding: 0.55rem 0.2rem; text-decoration: none;
		border-bottom: 1px solid var(--borda); }
	.prova:hover, .prova:focus-visible { background: var(--acento-fraco); outline: none; }
	.nome { display: block; font-size: 0.85rem; }
	.series { display: block; font-size: 0.68rem; color: var(--suave); margin-top: 0.1rem; }

	/* "terminada" é **palavra e não só cor**: a mesma regra da consola, e a mesma razão */
	.acabou { font-style: normal; font-size: 0.6rem; text-transform: uppercase;
		letter-spacing: 0.04em; color: var(--suave); border: 1px solid var(--borda);
		border-radius: 0.5rem; padding: 0.05rem 0.3rem; margin-left: 0.3rem;
		vertical-align: 0.1em; }

	.interruptor { display: block; width: 100%; margin: 0 0 0.8rem; padding: 0.5rem;
		font: inherit; font-size: 0.72rem; color: var(--suave); text-align: center;
		background: none; border: 1px dashed var(--borda); border-radius: 0.5rem;
		cursor: pointer; }
	.interruptor:hover, .interruptor:focus-visible { color: var(--texto);
		border-style: solid; outline: none; }
	.nota { font-size: 0.72rem; color: var(--suave); margin: 0 0 0.8rem; }
</style>
