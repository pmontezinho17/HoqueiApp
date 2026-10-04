<script lang="ts">
	import FaixaDias from '$lib/FaixaDias.svelte';
	import FitaDatas from '$lib/FitaDatas.svelte';
	import LinhaJogo from '$lib/LinhaJogo.svelte';
	import PaginaDia from '$lib/PaginaDia.svelte';
	import { favoritos } from '$lib/favoritos.svelte';
	import { emCurso } from '$lib/formato';
	import type { JogoAgenda } from '$lib/tipos';

	let { data } = $props();

	const hoje = new Date().toISOString().slice(0, 10);
	// janela em torno de hoje: a época toda dava 52 fichas de data, que não se navega
	const JANELA_ATRAS = 10,
		JANELA_FRENTE = 35;
	const limite = (dias: number) =>
		new Date(Date.now() + dias * 864e5).toISOString().slice(0, 10);

	/** índice data → jogos, feito uma vez: a faixa pede três dias de cada vez */
	const porDia = $derived.by(() => {
		const m = new Map<string, JogoAgenda[]>();
		for (const j of data.agenda as JogoAgenda[]) {
			(m.get(j.data) ?? m.set(j.data, []).get(j.data)!).push(j);
		}
		return m;
	});
	const jogosDe = (d: string) => porDia.get(d) ?? [];

	const dias = $derived(
		[...porDia.keys()]
			.filter((d) => d >= limite(-JANELA_ATRAS) && d <= limite(JANELA_FRENTE))
			.sort()
	);
	// abre no dia com jogos mais próximo de hoje, para frente
	let dia = $state('');
	$effect(() => {
		if (!dia) dia = dias.find((d) => d >= hoje) ?? dias.at(-1) ?? '';
	});

	let escalao = $state<string | null>(null);
	const ORDEM = [
		'SENIORES MASCULINOS', 'SENIORES FEMININOS', 'SUB-23', 'SUB-19',
		'SUB-17', 'SUB-15', 'SUB-13', 'ESCOLARES', 'BENJAMINS', 'BAMBIS'
	];

	// seguir é por clube E escalão
	const chave = (e: string, c: string) => `${c}\u0000${e}`;
	const seguidas = $derived(new Set(favoritos.lista.map((f) => chave(f.equipa, f.categoria))));
	const doDia = $derived(jogosDe(dia));

	/** A decorrer **agora**, de todos os escalões e independentemente do dia escolhido na
	 *  fita: quem abre a app a meio de um sábado quer ver isto primeiro, e não ter de
	 *  procurar. Fica fora da faixa que se arrasta, por não pertencer a nenhum dia.
	 *  Reavalia de minuto a minuto para a secção se apagar sozinha no fim. */
	let agora = $state(Date.now());
	$effect(() => {
		const t = setInterval(() => (agora = Date.now()), 60_000);
		return () => clearInterval(t);
	});
	const aoVivo = $derived.by(() => {
		void agora;
		return (data.agenda as JogoAgenda[]).filter(emCurso);
	});

	const escaloes = $derived.by(() => {
		const vistos = [...new Set(doDia.map((j) => j.cat))];
		return vistos.sort((a, b) => {
			const ia = ORDEM.indexOf(a),
				ib = ORDEM.indexOf(b);
			return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
		});
	});
	// ao mudar de dia o escalão escolhido pode não existir lá; o chip volta a "Todos"
	$effect(() => {
		if (escalao && !escaloes.includes(escalao)) escalao = null;
	});

	const eSeguida = (cat: string) => (equipa: string) => seguidas.has(chave(equipa, cat));
</script>

<svelte:head><title>Jogos — Hóquei em Patins</title></svelte:head>

<h1 class="sr">Jogos</h1>

<FitaDatas {dias} bind:escolhido={dia} />

{#if escaloes.length}
	<div class="escaloes" role="group" aria-label="Filtrar por escalão">
		<button class:activo={escalao === null} onclick={() => (escalao = null)}>Todos</button>
		{#each escaloes as e (e)}
			<button class:activo={escalao === e} onclick={() => (escalao = escalao === e ? null : e)}>
				{e.replace('SENIORES ', 'SEN. ')}
			</button>
		{/each}
	</div>
{/if}

{#if aoVivo.length}
	<section class="destacada vivo">
		<h2><i aria-hidden="true"></i>A decorrer agora</h2>
		{#each aoVivo as j (j.id ?? `${j.casa}${j.fora}`)}
			<LinhaJogo jogo={j} emblemas={data.emblemas} seguida={eSeguida(j.cat)} comEscalao />
		{/each}
	</section>
{/if}

<FaixaDias {dias} bind:escolhido={dia}>
	{#snippet pagina(d)}
		<PaginaDia
			dia={d}
			jogos={jogosDe(d)}
			emblemas={data.emblemas}
			{eSeguida}
			{escalao}
		/>
	{/snippet}
</FaixaDias>

<style>
	.escaloes {
		display: flex;
		gap: 0.25rem;
		overflow-x: auto;
		scrollbar-width: none;
		margin: 0 -0.9rem 0.7rem;
		padding: 0 0.9rem 0.2rem;
	}
	.escaloes::-webkit-scrollbar {
		display: none;
	}
	.escaloes button {
		flex: 0 0 auto;
		min-height: 44px;
		padding: 0.25rem 0.7rem;
		font-size: 0.74rem;
		white-space: nowrap;
		cursor: pointer;
		border-radius: 999px;
		border: 1px solid var(--borda);
		background: var(--cartao);
		color: var(--suave);
	}
	/* preenchido, como o dia escolhido na fita: era o que faltava para se ver que isto
	   filtra — ver docs/04-benchmarking.md */
	.escaloes button.activo {
		background: var(--acento);
		border-color: var(--acento);
		color: var(--cartao);
		font-weight: 600;
	}

	.destacada {
		margin-bottom: 1.1rem;
		border-left: 2px solid var(--acento);
		padding-left: 0.6rem;
	}
	.vivo {
		border-color: var(--vivo);
	}
	.vivo h2 {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		color: var(--vivo);
	}
	.vivo h2 i {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--vivo);
		animation: pulsar 1.6s ease-in-out infinite;
	}
	@keyframes pulsar {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.25; }
	}
	@media (prefers-reduced-motion: reduce) {
		.vivo h2 i {
			animation: none;
		}
	}
	.destacada h2 {
		font-size: 0.72rem;
		color: var(--acento);
		margin: 0 0 0.2rem;
		font-weight: 600;
	}
</style>
