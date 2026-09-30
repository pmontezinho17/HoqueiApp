<script lang="ts">
	import { carregarCompeticao } from '$lib/dados';
	import { favoritos } from '$lib/favoritos.svelte';
	import Folha from '$lib/Folha.svelte';
	import JogoLinha from '$lib/JogoLinha.svelte';
	import { porQuando } from '$lib/formato';
	import { disputado, type FicheiroCompeticao, type Jogo } from '$lib/tipos';

	let { data } = $props();

	let aberta = $state(false);
	let procura = $state('');
	let campo = $state<HTMLInputElement | null>(null);

	// sem isto o teclado do telemóvel não aparece e a folha parece morta
	$effect(() => {
		if (aberta) campo?.focus();
	});

	const normal = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

	const encontradas = $derived.by(() => {
		const q = normal(procura.trim());
		if (!q) return [];
		return data.equipas.filter((e) => normal(`${e.equipa} ${e.categoria}`).includes(q)).slice(0, 40);
	});

	/** Carrega as competições das equipas seguidas e resume cada uma. */
	async function resumir() {
		const ids = [...new Set(favoritos.lista.flatMap((f) => f.competicoes))];
		const provas = new Map<number, FicheiroCompeticao>();
		await Promise.all(
			ids.map(async (id) => {
				try { provas.set(id, await carregarCompeticao(id, fetch)); } catch { /* ignora */ }
			})
		);
		const hoje = new Date().toISOString().slice(0, 10);
		return favoritos.lista.map((f) => {
			const seus: Jogo[] = f.competicoes
				.flatMap((id) => provas.get(id)?.jogos ?? [])
				.filter((j) => j.casa === f.equipa || j.fora === f.equipa);
			const ordenados = porQuando(seus);
			const posicoes = f.competicoes.flatMap((id) =>
				(provas.get(id)?.classificacao ?? []).flatMap((g) =>
					g.linhas.filter((l) => l.equipa === f.equipa).map((l) => ({
						prova: provas.get(id)!.competicao.nome, grupo: g.nome, linha: l
					}))
				)
			);
			return {
				fav: f,
				proximo: ordenados.find((j) => !disputado(j) && (j.data ?? '') >= hoje),
				ultimo: [...ordenados].reverse().find(disputado),
				posicoes
			};
		});
	}
</script>

<svelte:head><title>O Meu Clube — Hóquei em Patins</title></svelte:head>

{#if favoritos.lista.length === 0}
	<div class="convite">
		<h1>Segue as tuas equipas</h1>
		<p>
			Escolhe um clube e um escalão. A app passa a abrir aqui, com o próximo jogo,
			o último resultado e a posição na tabela.
		</p>
		<button class="principal" onclick={() => (aberta = true)}>Escolher equipa</button>
	</div>
{:else}
	{#await resumir()}
		<p class="vazio">A reunir os jogos…</p>
	{:then resumos}
		{#each resumos as r (r.fav.equipa + r.fav.categoria)}
			<section>
				<header>
					<div>
						<h2>{r.fav.equipa}</h2>
						<span class="escalao">{r.fav.categoria}</span>
					</div>
					<button
						class="deixar"
						onclick={() => favoritos.alternar(r.fav.equipa, r.fav.categoria, r.fav.competicoes)}
						aria-label={`Deixar de seguir ${r.fav.equipa} ${r.fav.categoria}`}
					>Deixar de seguir</button>
				</header>

				{#if r.proximo}
					<p class="rotulo">Próximo jogo</p>
					<JogoLinha jogo={r.proximo} comp={r.fav.competicoes[0]} />
				{/if}
				{#if r.ultimo}
					<p class="rotulo">Último resultado</p>
					<JogoLinha jogo={r.ultimo} comp={r.fav.competicoes[0]} />
				{/if}
				{#if !r.proximo && !r.ultimo}
					<p class="vazio">Sem jogos publicados para esta equipa.</p>
				{/if}

				{#each r.posicoes as p (p.prova + (p.grupo ?? ''))}
					<p class="posicao">
						<strong>{p.linha.posicao}º</strong>
						<span>{p.prova}{p.grupo ? ` · ${p.grupo}` : ''}</span>
						<span class="pts">{p.linha.pontos} pts</span>
					</p>
				{/each}
			</section>
		{/each}
		<button class="secundaria" onclick={() => (aberta = true)}>Seguir outra equipa</button>
	{/await}
{/if}

<Folha bind:aberta titulo="Seguir uma equipa">
	<input bind:this={campo} type="search" bind:value={procura} placeholder="Nome do clube" aria-label="Procurar clube" />
	{#each encontradas as e (e.equipa + e.categoria)}
		<button
			class="opcao" class:activa={favoritos.segue(e.equipa, e.categoria)}
			onclick={() => favoritos.alternar(e.equipa, e.categoria, e.competicoes)}
		>
			<span>{e.equipa}<span class="cat">{e.categoria}</span></span>
			<span class="marca">{favoritos.segue(e.equipa, e.categoria) ? '✓' : '+'}</span>
		</button>
	{/each}
	{#if procura.trim() && encontradas.length === 0}
		<p class="vazio">Nenhum clube encontrado.</p>
	{:else if !procura.trim()}
		<p class="vazio">Escreve o nome do clube — por exemplo “Parede” ou “Benfica”.</p>
	{/if}
</Folha>

<style>
	.convite { text-align: center; padding: 2.5rem 1rem; }
	.convite h1 { font-size: 1.1rem; margin: 0 0 0.5rem; }
	.convite p { color: var(--suave); font-size: 0.88rem; margin: 0 auto 1.4rem; max-width: 24rem; }
	.principal, .secundaria {
		min-height: 44px; padding: 0.7rem 1.4rem; font-size: 0.9rem; cursor: pointer;
		border-radius: 8px; border: 1px solid var(--acento);
	}
	.principal { background: var(--acento); color: var(--cartao); border: 0; }
	.secundaria { width: 100%; background: none; color: var(--acento); margin-top: 0.5rem; }

	section { margin-bottom: 1.6rem; }
	section header { display: flex; align-items: baseline; justify-content: space-between;
		gap: 0.6rem; margin-bottom: 0.6rem; }
	h2 { font-size: 1rem; margin: 0; }
	.escalao { font-size: 0.7rem; color: var(--acento); text-transform: uppercase;
		letter-spacing: 0.05em; }
	.deixar { background: none; border: 0; color: var(--suave); font-size: 0.74rem;
		cursor: pointer; min-height: 44px; }
	.rotulo { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.06em;
		color: var(--suave); margin: 0.7rem 0 0.35rem; }
	.posicao { display: flex; align-items: baseline; gap: 0.5rem; font-size: 0.78rem;
		color: var(--suave); margin: 0.45rem 0 0; }
	.posicao strong { color: var(--texto); font-size: 0.9rem; }
	.posicao span:nth-of-type(1) { flex: 1; overflow: hidden; text-overflow: ellipsis;
		white-space: nowrap; }
	.pts { font-variant-numeric: tabular-nums; }

	input { width: 100%; padding: 0.6rem 0.7rem; margin: 0.2rem 0 0.8rem; font-size: 0.9rem;
		border-radius: 8px; border: 1px solid var(--borda); background: var(--cartao); color: inherit; }
	.opcao { display: flex; justify-content: space-between; align-items: center; gap: 0.6rem;
		width: 100%; min-height: 44px; padding: 0.55rem 0.7rem; margin-bottom: 0.3rem;
		font-size: 0.85rem; text-align: left; cursor: pointer; border-radius: 8px;
		border: 1px solid var(--borda); background: var(--cartao); color: inherit; }
	.opcao.activa { border-color: var(--acento); }
	.cat { display: block; font-size: 0.68rem; color: var(--suave); }
	.marca { color: var(--acento); font-weight: 700; }
	.vazio { color: var(--suave); font-size: 0.82rem; }
</style>
