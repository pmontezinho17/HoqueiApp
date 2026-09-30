<script lang="ts">
	import type { TotaisJogador } from '$lib/tipos';

	let { data } = $props();
	const q = $derived(data.quadro);

	type Eixo = 'golos' | 'assistencias' | 'defesas';
	let eixo = $state<Eixo>('golos');

	const ROTULO: Record<Eixo, string> = {
		golos: 'Golos', assistencias: 'Assistências', defesas: 'Defesas'
	};

	const ordenados = $derived.by(() => {
		if (!q) return [] as TotaisJogador[];
		return q.jogadores
			.filter((j) => j[eixo] > 0)
			.sort((a, b) => b[eixo] - a[eixo] || a.jogos - b.jogos || a.nome.localeCompare(b.nome))
			.slice(0, 50);
	});

	/** Posição com empates: dois jogadores com o mesmo número partilham o lugar. */
	function posicoes(lista: TotaisJogador[]): number[] {
		const pos: number[] = [];
		lista.forEach((j, i) => {
			pos.push(i > 0 && lista[i - 1][eixo] === j[eixo] ? pos[i - 1] : i + 1);
		});
		return pos;
	}
	const lugares = $derived(posicoes(ordenados));
</script>

<svelte:head><title>Quadros — {data.escolhida.nome}</title></svelte:head>

{#if !q || q.jogadores.length === 0}
	<p class="vazio">
		Ainda não há jogos disputados com ficha publicada nesta competição.
	</p>
{:else}
	<div class="eixos" role="tablist">
		{#each ['golos', 'assistencias', 'defesas'] as const as e (e)}
			{#if e !== 'defesas' || q.tem_defesas}
				<button role="tab" aria-selected={eixo === e} onclick={() => (eixo = e)}>
					{ROTULO[e]}
				</button>
			{/if}
		{/each}
	</div>

	{#if ordenados.length === 0}
		<p class="vazio">Sem {ROTULO[eixo].toLowerCase()} registados nesta competição.</p>
	{:else}
		<ol class="lista">
			{#each ordenados as j, i (j.equipa + j.nome)}
				<li class:podio={lugares[i] <= 3}>
					<span class="lugar">{lugares[i]}</span>
					<span class="quem">
						<span class="nome">{j.nome}</span>
						<span class="clube">{j.equipa}</span>
					</span>
					<span class="numeros">
						<span class="principal">{j[eixo]}</span>
						<span class="media">{(j[eixo] / j.jogos).toFixed(1)}/jogo · {j.jogos}j</span>
					</span>
				</li>
			{/each}
		</ol>
		<p class="nota">
			Somado a partir de {q.jogos_considerados} fichas de jogo publicadas.
			{#if eixo === 'defesas'}A fonte só regista defesas numa parte dos jogos.{/if}
		</p>
	{/if}
{/if}

<style>
	.eixos { display: flex; gap: 0.3rem; margin-bottom: 0.9rem; }
	.eixos button {
		flex: 1; min-height: 44px; padding: 0.5rem 0.3rem; font-size: 0.84rem; cursor: pointer;
		border-radius: 8px; border: 1px solid var(--borda);
		background: var(--cartao); color: var(--suave);
	}
	.eixos button[aria-selected='true'] { color: var(--acento); border-color: var(--acento); font-weight: 600; }

	.lista { list-style: none; margin: 0; padding: 0; }
	li {
		display: grid; grid-template-columns: 1.9rem 1fr auto; align-items: center; gap: 0.6rem;
		padding: 0.55rem 0.75rem; background: var(--cartao);
		border: 1px solid var(--borda); border-radius: 10px; margin-bottom: 0.35rem;
	}
	li.podio { border-color: var(--acento); }
	.lugar { text-align: center; font-variant-numeric: tabular-nums; color: var(--suave);
		font-size: 0.82rem; }
	li.podio .lugar { color: var(--acento); font-weight: 700; }
	.quem { display: flex; flex-direction: column; min-width: 0; }
	.nome { font-size: 0.88rem; font-weight: 500; overflow: hidden;
		text-overflow: ellipsis; white-space: nowrap; }
	.clube { font-size: 0.72rem; color: var(--suave); overflow: hidden;
		text-overflow: ellipsis; white-space: nowrap; }
	.numeros { text-align: right; display: flex; flex-direction: column; }
	.principal { font-size: 1.05rem; font-weight: 700; font-variant-numeric: tabular-nums; }
	.media { font-size: 0.68rem; color: var(--suave); font-variant-numeric: tabular-nums; }
	.nota, .vazio { color: var(--suave); font-size: 0.76rem; margin-top: 0.8rem; }
</style>
