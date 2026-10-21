<script lang="ts">
	import Faixa from '$lib/Faixa.svelte';
	import { APP_NOME } from '$lib/sitio';
	import FitaDatas from '$lib/FitaDatas.svelte';
	import PaginaDia from '$lib/PaginaDia.svelte';
	import { page } from '$app/state';
	import { afterNavigate, replaceState } from '$app/navigation';
	import { favoritos } from '$lib/favoritos.svelte';
	import { porEscalao } from '$lib/escaloes';
	import { AGRUPAMENTOS, type Agrupamento } from '$lib/agrupar';
	import { guia } from '$lib/guia.svelte';
	import { caminhoEquipa } from '$lib/slug';
	import type { JogoAgenda } from '$lib/tipos';
	import { diaDeLisboa, diaDeLisboaMais } from '$lib/dia';

	let { data } = $props();

	const hoje = diaDeLisboa();
	// janela em torno de hoje: a época toda dava 52 fichas de data, que não se navega
	const JANELA_ATRAS = 10,
		JANELA_FRENTE = 35;
	const limite = (dias: number) =>
		diaDeLisboaMais(dias);

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
	/**
	 * Como agrupar os jogos do dia: por escalão, por hora ou por recinto.
	 *
	 * Sugestão `S12`, de um utilizador a 17/10/2026, que o dono mandou avançar a 21/10. Fica em
	 * `$state` simples, como os chips de escalão aqui ao lado — nem no endereço nem no
	 * armazenamento. O armazenamento tinha um preço que isto não paga: a política de privacidade
	 * enumera **uma** chave em `localStorage`, e acrescentar outra obrigava a reescrevê-la.
	 */
	let agrupamento = $state<Agrupamento>('escalao');

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

	/**
	 * O tour da primeira visita arranca aqui e não no arranque da app.
	 *
	 * Os passos vivem todos neste ecrã e na barra de baixo, e a app instalada abre em "O Meu
	 * Clube" — que sem favoritos já é um ecrã a explicar-se. Quem instalar vê o tour na
	 * primeira vez que abrir os jogos, que é quando ele tem alvos para iluminar.
	 */
	$effect(() => {
		// Uma equipa real para o passo do tour que vive numa página de equipa. Este ecrã é o
		// que tem a agenda carregada; o módulo do guia não vê os dados.
		const j = doDia[0] ?? (data.agenda as JogoAgenda[])[0];
		if (j) guia.equipaExemplo = caminhoEquipa(j.casa, j.cat);
		guia.talvezComecar();
	});

	/**
	 * `?guia=1` força o tour, mesmo a quem já o viu.
	 *
	 * Existe porque a marca de "já vi" fica no armazenamento do aparelho, e num telemóvel
	 * que não é o nosso não há como a limpar: quem queira rever o guia e não encontre o
	 * botão em "Sobre" fica sem saída. Um endereço resolve-o de qualquer máquina.
	 *
	 * **O parâmetro é consumido no mesmo instante.** Deixá-lo no endereço fazia o tour
	 * reiniciar-se de cada vez que voltasse a esta página — e ele volta cá no fim.
	 */
	$effect(() => {
		if (!routerPronto) return;
		const u = new URL(location.href);
		if (!u.searchParams.has('guia')) return;
		u.searchParams.delete('guia');
		replaceState(u, {});
		guia.comecar();
	});
</script>

<svelte:head><title>Jogos — {APP_NOME}</title></svelte:head>

<h1 class="sr">Jogos</h1>

<FitaDatas {dias} bind:escolhido={dia} {progresso} />

{#if escaloes.length}
	<div class="escaloes" role="group" aria-label="Filtrar por escalão" data-guia="escaloes">
		<button class:activo={escalao === null} onclick={() => (escalao = null)}>Todos</button>
		{#each escaloes as e (e)}
			<button class:activo={escalao === e} onclick={() => (escalao = escalao === e ? null : e)}>
				{e.replace('SENIORES ', 'SEN. ')}
			</button>
		{/each}
	</div>
{/if}

<!--
  **Agrupar por**, e não "ordenar por": a lista muda de blocos, não de ordem dentro deles.

  Fica numa linha só, de 28 px, por baixo dos chips de escalão. Custa altura num ecrã onde já
  se pagou uma vez o erro de ter títulos a mais antes do primeiro resultado — por isso os
  botões são pequenos e o rótulo é curto.
-->
<div class="agrupar" role="group" aria-label="Agrupar os jogos">
	<span>Agrupar</span>
	{#each AGRUPAMENTOS as a (a.id)}
		<button class:activo={agrupamento === a.id} aria-pressed={agrupamento === a.id}
			onclick={() => (agrupamento = a.id)}>{a.rotulo}</button>
	{/each}
</div>

<Faixa itens={dias} bind:escolhido={dia} bind:progresso>
	{#snippet pagina(d)}
		<PaginaDia
			dia={d}
			jogos={jogosDe(d)}
			emblemas={data.emblemas}
			{eSeguida}
			{escalao}
			{agrupamento}
			{agora}
		/>
	{/snippet}
</Faixa>

<style>
	/* Um degrau visual abaixo da fita de datas: a fita é navegação, isto é filtro. Com os
	   dois no mesmo tamanho liam-se como duas filas iguais a competir pela atenção. */
	/* a linha do "Agrupar": mais baixa e mais discreta do que a dos escalões, porque é uma
	   escolha de arrumação e não um filtro — quem vem ver resultados não vem decidir isto */
	.agrupar {
		display: flex;
		align-items: center;
		gap: var(--e-1);
		margin: calc(var(--e-4) * -1) 0 var(--e-4);
	}
	.agrupar > span {
		font-size: var(--t-micro);
		color: var(--suave);
		margin-right: var(--e-1);
	}
	.agrupar button {
		min-height: 28px;
		padding: 0 var(--e-2);
		font-size: var(--t-micro);
		cursor: pointer;
		border-radius: var(--raio-pilula);
		border: 1px solid var(--borda);
		background: transparent;
		color: var(--suave);
	}
	.agrupar button.activo {
		border-color: var(--acento);
		color: var(--acento);
		font-weight: 600;
	}

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
