<script lang="ts">
	import { favoritos } from '$lib/favoritos.svelte';
	import { dataLonga } from '$lib/formato';
	import type { JogoAgenda } from '$lib/tipos';

	let { data } = $props();

	type Modo = 'proximos' | 'resultados';
	let modo = $state<Modo>('proximos');
	let soMinhas = $state(false);

	// o filtro liga-se sozinho para quem segue equipas: 58 jogos num sábado é ruído
	$effect(() => {
		soMinhas = favoritos.lista.length > 0;
	});

	const hoje = new Date().toISOString().slice(0, 10);
	// Seguir é por clube E escalão: o "PAREDE FC B" dos sub-13 não é o dos escolares,
	// por isso a chave inclui a categoria. Comparar só pelo nome trazia jogos a mais.
	const chave = (equipa: string, categoria: string) => `${categoria}\u0000${equipa}`;
	const seguidas = $derived(
		new Set(favoritos.lista.map((f) => chave(f.equipa, f.categoria)))
	);

	const seguida = (equipa: string, categoria: string) => seguidas.has(chave(equipa, categoria));
	const segue = (j: JogoAgenda) => seguida(j.casa, j.cat) || seguida(j.fora, j.cat);

	const visiveis = $derived.by(() => {
		let js = data.agenda.filter((j: JogoAgenda) =>
			modo === 'proximos' ? j.data >= hoje : j.data < hoje
		);
		if (modo === 'resultados') js = [...js].reverse();
		if (soMinhas && seguidas.size) js = js.filter(segue);
		return js.slice(0, 120);
	});

	const porDia = $derived.by(() => {
		const dias = new Map<string, JogoAgenda[]>();
		for (const j of visiveis) (dias.get(j.data) ?? dias.set(j.data, []).get(j.data)!).push(j);
		return [...dias];
	});

	const jogado = (j: JogoAgenda) => j.gc !== null && j.gf !== null;
</script>

<svelte:head><title>Agenda — Hóquei em Patins</title></svelte:head>

<div class="controlos">
	<div class="modos" role="tablist">
		<button role="tab" aria-selected={modo === 'proximos'} onclick={() => (modo = 'proximos')}>
			Próximos
		</button>
		<button role="tab" aria-selected={modo === 'resultados'} onclick={() => (modo = 'resultados')}>
			Resultados
		</button>
	</div>
	{#if favoritos.lista.length}
		<label class="filtro">
			<input type="checkbox" bind:checked={soMinhas} />
			Só as minhas equipas
		</label>
	{/if}
</div>

{#if porDia.length === 0}
	<p class="vazio">
		{#if soMinhas}
			Nenhuma das tuas equipas tem jogos {modo === 'proximos' ? 'marcados' : 'disputados'}.
			<button class="limpar" onclick={() => (soMinhas = false)}>Ver todos</button>
		{:else}
			Sem jogos {modo === 'proximos' ? 'marcados' : 'disputados'}.
		{/if}
	</p>
{:else}
	{#each porDia as [dia, jogos] (dia)}
		<section>
			<h2 class:hoje={dia === hoje}>
				{dataLonga(dia)}{#if dia === hoje}<span class="badge">hoje</span>{/if}
				<span class="quantos">{jogos.length}</span>
			</h2>
			{#each jogos as j (j.id ?? `${j.data}${j.casa}${j.fora}`)}
				<svelte:element
					this={jogado(j) && j.id ? 'a' : 'div'}
					href={jogado(j) && j.id ? `/jogo/${j.id}?comp=${j.comp}` : null}
					class="jogo" class:meu={segue(j)}
				>
					<span class="hora">{j.hora ?? '—'}</span>
					<span class="equipas">
						<span class:destaque={seguida(j.casa, j.cat)}>{j.casa}</span>
						<span class:destaque={seguida(j.fora, j.cat)}>{j.fora}</span>
					</span>
					<span class="res">
						{#if jogado(j)}
							<span>{j.gc}</span><span>{j.gf}</span>
						{:else}
							<span class="porjogar" aria-hidden="true">–</span>
						{/if}
					</span>
					<span class="prova">{j.cat} · {j.prova}</span>
				</svelte:element>
			{/each}
		</section>
	{/each}
{/if}

<style>
	.controlos { margin-bottom: 1rem; }
	.modos { display: flex; gap: 0.3rem; }
	.modos button {
		flex: 1; min-height: 44px; font-size: 0.85rem; cursor: pointer; border-radius: 8px;
		border: 1px solid var(--borda); background: var(--cartao); color: var(--suave);
	}
	.modos button[aria-selected='true'] { color: var(--acento); border-color: var(--acento); font-weight: 600; }
	.filtro { display: flex; align-items: center; gap: 0.45rem; margin-top: 0.6rem;
		font-size: 0.82rem; color: var(--suave); min-height: 44px; cursor: pointer; }
	.filtro input { width: 18px; height: 18px; accent-color: var(--acento); }

	section { margin-bottom: 1.3rem; }
	h2 { display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem;
		text-transform: uppercase; letter-spacing: 0.05em; color: var(--suave);
		margin: 0 0 0.5rem; font-weight: 600; }
	h2.hoje { color: var(--acento); }
	.badge { padding: 0.08rem 0.4rem; border-radius: 999px; background: var(--acento);
		color: var(--cartao); font-size: 0.66rem; }
	.quantos { margin-left: auto; font-weight: 400; text-transform: none; }

	.jogo {
		display: grid; grid-template-columns: 3.1rem 1fr auto;
		grid-template-areas: 'hora equipas res' '. prova prova';
		gap: 0.1rem 0.6rem; padding: 0.55rem 0.7rem; margin-bottom: 0.35rem;
		background: var(--cartao); border: 1px solid var(--borda); border-radius: 10px;
		text-decoration: none; color: inherit;
	}
	.jogo.meu { border-color: var(--acento); background: var(--acento-fraco); }
	.hora { grid-area: hora; font-size: 0.76rem; color: var(--suave);
		font-variant-numeric: tabular-nums; }
	.equipas { grid-area: equipas; display: flex; flex-direction: column; gap: 0.1rem;
		font-size: 0.86rem; min-width: 0; }
	.equipas span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.destaque { font-weight: 700; }
	.res { grid-area: res; display: flex; flex-direction: column; gap: 0.1rem;
		text-align: right; font-size: 0.86rem; font-variant-numeric: tabular-nums; }
	.porjogar { color: var(--suave); }
	.prova { grid-area: prova; font-size: 0.68rem; color: var(--suave);
		overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.vazio { color: var(--suave); font-size: 0.85rem; }
	.limpar { margin-left: 0.4rem; background: none; border: 0; color: var(--acento);
		cursor: pointer; font-size: 0.85rem; text-decoration: underline; }
</style>
