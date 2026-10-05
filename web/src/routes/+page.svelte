<script lang="ts">
	import Faixa from '$lib/Faixa.svelte';
	import FitaDatas from '$lib/FitaDatas.svelte';
	import PaginaDia from '$lib/PaginaDia.svelte';
	import { page } from '$app/state';
	import { afterNavigate, replaceState } from '$app/navigation';
	import { favoritos } from '$lib/favoritos.svelte';
	import { porEscalao } from '$lib/escaloes';
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
	/**
	 * Abre no dia com jogos mais próximo de hoje — ou no que vier no endereço.
	 *
	 * O `?dia=` existe para quem volta de um jogo: sair de um jogo de quinta-feira e cair
	 * em hoje é perder o sítio onde se estava. E de caminho torna um dia partilhável.
	 */
	let dia = $state('');
	$effect(() => {
		if (dia) return;
		const pedido = page.url.searchParams.get('dia');
		dia = (pedido && dias.includes(pedido) ? pedido : null)
			?? dias.find((d) => d >= hoje)
			?? dias.at(-1)
			?? '';
	});
	/**
	 * Mantém o endereço a par do dia, sem encher o histórico.
	 *
	 * O `afterNavigate` não é enfeite: na primeira renderização o `$effect` corre **antes**
	 * de o router do SvelteKit estar pronto, e o `replaceState` atira
	 * "Cannot call replaceState(...) before router is initialized" — o que partia a página
	 * inteira, não só o endereço. O `afterNavigate` dispara quando a navegação inicial já
	 * acabou, que é exactamente o sinal de que o router existe.
	 */
	let routerPronto = $state(false);
	afterNavigate(() => (routerPronto = true));
	$effect(() => {
		if (!routerPronto || !dia) return;
		const u = new URL(location.href);
		if (u.searchParams.get('dia') === dia) return;
		u.searchParams.set('dia', dia);
		replaceState(u, {});
	});

	/** quanto da página já foi arrastada: a fita de datas usa-o para acompanhar o dedo */
	let progresso = $state(0);

	let escalao = $state<string | null>(null);

	// seguir é por clube E escalão
	const chave = (e: string, c: string) => `${c}\u0000${e}`;
	const seguidas = $derived(new Set(favoritos.lista.map((f) => chave(f.equipa, f.categoria))));
	const doDia = $derived(jogosDe(dia));

	/**
	 * O minuto a que vamos, para a secção dos jogos a decorrer.
	 *
	 * A secção em si vive na página do dia, em `PaginaDia` — tem de entrar e sair com o dia
	 * quando se arrasta, e aqui fora ficava agarrada ao ecrã enquanto tudo o resto deslizava.
	 * O relógio fica deste lado porque há três dias montados ao mesmo tempo e um contador
	 * chega para os três.
	 *
	 * De minuto a minuto, para a secção se apagar sozinha quando o último jogo acabar.
	 */
	let agora = $state(Date.now());
	$effect(() => {
		const t = setInterval(() => (agora = Date.now()), 60_000);
		return () => clearInterval(t);
	});
	// a mesma ordem dos blocos da lista, de `escaloes.ts`: estavam em dois sítios e divergiam
	const escaloes = $derived([...new Set(doDia.map((j) => j.cat))].sort(porEscalao));
	// ao mudar de dia o escalão escolhido pode não existir lá; o chip volta a "Todos"
	$effect(() => {
		if (escalao && !escaloes.includes(escalao)) escalao = null;
	});

	const eSeguida = (cat: string) => (equipa: string) => seguidas.has(chave(equipa, cat));
</script>

<svelte:head><title>Jogos — Hóquei em Patins</title></svelte:head>

<h1 class="sr">Jogos</h1>

<FitaDatas {dias} bind:escolhido={dia} {progresso} />

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

<Faixa itens={dias} bind:escolhido={dia} bind:progresso>
	{#snippet pagina(d)}
		<PaginaDia
			dia={d}
			jogos={jogosDe(d)}
			emblemas={data.emblemas}
			{eSeguida}
			{escalao}
			{agora}
		/>
	{/snippet}
</Faixa>

<style>
	/* Um degrau visual abaixo da fita de datas: a fita é navegação, isto é filtro. Com os
	   dois no mesmo tamanho liam-se como duas filas iguais a competir pela atenção. */
	.escaloes {
		display: flex;
		gap: var(--e-1);
		overflow-x: auto;
		scrollbar-width: none;
		margin: 0 -0.9rem var(--e-4);
		padding: 0 0.9rem var(--e-1);
	}
	.escaloes::-webkit-scrollbar {
		display: none;
	}
	.escaloes button {
		flex: 0 0 auto;
		min-height: 36px;
		padding: var(--e-1) var(--e-3);
		font-size: var(--t-micro);
		letter-spacing: 0.02em;
		white-space: nowrap;
		cursor: pointer;
		border-radius: var(--raio-pilula);
		border: 1px solid var(--borda);
		background: transparent;
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

</style>
