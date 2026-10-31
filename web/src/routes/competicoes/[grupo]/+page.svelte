<script lang="ts">
	import Emblema from '$lib/Emblema.svelte';
	import { APP_NOME } from '$lib/sitio';
	import RotuloCalculada from '$lib/RotuloCalculada.svelte';
	import { COLUNAS, tabelasDe } from '$lib/classificacao';
	import TopoFixo from '$lib/TopoFixo.svelte';
	import Faixa from '$lib/Faixa.svelte';
	import LinhaJogo from '$lib/LinhaJogo.svelte';
	import TabelaClassificacao from '$lib/TabelaClassificacao.svelte';
	import TabelaMerito from '$lib/TabelaMerito.svelte';
	import ChapeuMerito from '$lib/ChapeuMerito.svelte';
	import LegendaMerito from '$lib/LegendaMerito.svelte';
	import RegrasMerito from '$lib/RegrasMerito.svelte';
	import { favoritos } from '$lib/favoritos.svelte';
	import { jornadaAtual, porQuando, nomeProprio } from '$lib/formato';
	import { caminhoEquipa } from '$lib/slug';
	import type { Jogo, JogoAgenda, TotaisJogador } from '$lib/tipos';
	import { meritoPorJogo } from '$lib/meritoDoJogo';
	import { opcoesDeSerie, seriesVisiveis } from '$lib/series';
	import Separadores from '$lib/Separadores.svelte';
	import Escolha from '$lib/Escolha.svelte';
	import LegendaClassificacao from '$lib/LegendaClassificacao.svelte';
	import { afterNavigate } from '$app/navigation';
	import { guardarNoEndereco } from '$lib/endereco';
	import { page } from '$app/state';
	import { untrack } from 'svelte';

	let { data } = $props();

	type Aba = 'classificacao' | 'calendario' | 'marcadores';
	let aba = $state<Aba>('classificacao');

	/**
	 * Nestes escalões o Mérito **é** a classificação, e não uma segunda tabela ao lado.
	 *
	 * Mudou a 10/10/2026, a pedido do dono depois de lermos o regulamento: *"a única tabela
	 * que vamos ter de classificação é a do Mérito"*. Até aí havia duas — uma de 3/1/0 que
	 * nós tínhamos inventado e que não existe em lado nenhum, e esta. A APL não publica
	 * classificação nestes escalões de propósito; o Artigo 92.º diz o que se escalona ali.
	 */
	const temMerito = $derived(data.provas.some((p) => p.merito?.linhas.length));

	// As séries empilham-se — nunca se fundem, porque não se enfrentam. Escolhe-se qualquer
	// uma, ou todas: ver `lib/series.ts` e a sugestão de 29/10/2026 que o pediu.
	let serie = $state('');
	let completa = $state(false);
	const temSeries = $derived(data.provas.length > 1);
	// no Mérito não há colunas a escolher: a tabela é a do regulamento
	const colunasEm = (a: string) => a === 'classificacao' && !temMerito;

	const minhasEquipas = $derived(new Set(favoritos.lista.map((f) => f.equipa)));
	const opcoes = $derived(opcoesDeSerie(data.provas, minhasEquipas));
	const visiveis = $derived(seriesVisiveis(data.provas, serie));

	/**
	 * A série e a aba vivem no endereço, como na página da equipa: abrir um jogo do calendário
	 * da série B e voltar com a seta devolve o calendário da série B, e um link partilhado
	 * abre-o — ver `lib/endereco.ts`. Espera pelo router: antes dele parte a página inteira, já
	 * aconteceu na lista de jogos. A Classificação é a aba por omissão e não se escreve.
	 */
	const ABAS: Aba[] = ['classificacao', 'calendario', 'marcadores'];
	// só o endereço manda aqui: com o `serie` lido também, um toque em "B" voltava a "Todas"
	// antes de a navegação chegar ao endereço
	$effect(() => {
		const s = page.url.searchParams.get('serie') ?? '';
		const a = page.url.searchParams.get('aba');
		untrack(() => {
			if (s !== serie) serie = s;
			const alvo = a && ABAS.includes(a as Aba) ? (a as Aba) : 'classificacao';
			if (alvo !== aba) aba = alvo;
		});
	});
	let routerPronto = $state(false);
	afterNavigate(() => (routerPronto = true));
	$effect(() => {
		if (!routerPronto) return;
		const u = new URL(location.href);
		const abaAlvo = aba === 'classificacao' ? null : aba;
		if ((u.searchParams.get('serie') ?? '') === serie && u.searchParams.get('aba') === abaAlvo) return;
		if (serie) u.searchParams.set('serie', serie);
		else u.searchParams.delete('serie');
		if (abaAlvo) u.searchParams.set('aba', abaAlvo);
		else u.searchParams.delete('aba');
		void guardarNoEndereco(u);
	});

	const destaque = (equipa: string) => minhasEquipas.has(equipa);
	// somados entre as séries do ecrã, porque as notas aparecem uma só vez lá em baixo
	const meritoPorConfirmar = $derived(
		visiveis.reduce((s, p) => s + (p.merito?.linhas ?? []).reduce((x, l) => x + l.por_confirmar, 0), 0)
	);
	const meritoSemBoletim = $derived(
		visiveis.reduce((s, p) => s + (p.merito?.jogos_sem_boletim ?? 0), 0)
	);

	/** Assistências por equipa, somadas das fichas desta prova. `null` quando não há fichas:
	 *  sem isto uma equipa sem dados somava zero e lia-se como pior do que é. */
	const assistencias = (quadro: { jogadores: TotaisJogador[] } | null | undefined) => {
		if (!quadro?.jogadores.length) return null;
		const m = new Map<string, number>();
		for (const j of quadro.jogadores) m.set(j.equipa, (m.get(j.equipa) ?? 0) + j.assistencias);
		return m;
	};

	// marcadores: somados entre séries, com a série ao lado de cada jogador, porque
	// as séries não se enfrentam e um ranking sem isso seria enganador
	/**
	 * Quantos jogos é que estes totais contam.
	 *
	 * Existe por uma pergunta de uma utilizadora a 17/10/2026: *"Não percebo bem a parte dos
	 * golos, e por jogo? Fui ver a lista e o meu filho tem o número de golos equivalente aos que
	 * marcou no jogo de hoje."*
	 *
	 * Fui medir antes de tocar em nada, e **os dados estavam certos**: a 20/10 eram 414 fichas
	 * para 414 jogos disputados, e mesmo na noite em que ela escreveu os totais já somavam vários
	 * jogos por jogador. O que faltava era o ecrã dizer o que o número é — o total aparecia a
	 * negrito e, por baixo, `2A · 4j` sem legenda nenhuma. Ela não leu mal: não havia o que ler.
	 */
	const jogosContados = $derived(
		visiveis.reduce((n, p) => n + (p.quadro?.jogos_considerados ?? 0), 0)
	);

	const marcadores = $derived.by(() => {
		const linhas: (TotaisJogador & { serie: string | null })[] = [];
		for (const p of visiveis)
			for (const j of p.quadro?.jogadores ?? [])
				linhas.push({ ...j, serie: p.competicao.serie ?? null });
		return linhas.sort((a, b) => b.golos - a.golos || b.assistencias - a.assistencias).slice(0, 40);
	});

	const jogosDaProva = (jogos: Jogo[]) => {
		const atual = jornadaAtual(jogos);
		const m = new Map<string, Jogo[]>();
		for (const j of porQuando(jogos)) (m.get(j.jornada) ?? m.set(j.jornada, []).get(j.jornada)!).push(j);
		return { atual, jornadas: [...m] };
	};

	const meritoDosJogos = $derived(meritoPorJogo(data.agenda as JogoAgenda[]));
	const paraAgenda = (j: Jogo, comp: number, cat: string) => ({
		id: j.id, data: j.data ?? '', hora: j.hora ? j.hora.slice(0, 5) : null,
		casa: j.casa, fora: j.fora, gc: j.golos_casa, gf: j.golos_fora,
		recinto: j.recinto, comp, prova: '', cat,
		merito: j.id !== null ? meritoDosJogos.get(j.id) : undefined
	});
</script>

<svelte:head><title>{data.grupoNome} — {APP_NOME}</title></svelte:head>

<TopoFixo>
	<header class="titulo">
		<p class="escalao">{data.escalao}</p>
		<h1>{data.grupoNome}</h1>
		{#if temSeries}
			<p class="quantas">{data.provas.length} séries</p>
		{/if}
	</header>

	<div class="barra">
		<Separadores activo={aba} escolher={(v) => (aba = v)} separadores={[
			{ valor: 'classificacao', rotulo: 'Classificação', icone: 'tabela' },
			{ valor: 'calendario', rotulo: 'Calendário', icone: 'data' },
			{ valor: 'marcadores', rotulo: 'Marcadores', icone: 'marcadores' }
		]} />
	</div>
</TopoFixo>

<!-- Arrastar para o lado muda de separador, como na ficha de jogo. Os controlos vão dentro de
     cada página e não por cima da faixa: as colunas só existem na Classificação, e assim a
     fila desliza com o conteúdo a que pertence. Nas pontas não passa ao menu vizinho: uma
     competição está dentro das Competições — ver a `lib/Faixa.svelte`. -->
<Faixa itens={ABAS} bind:escolhido={aba}>
	{#snippet pagina(a)}
		<!-- A série e as colunas lado a lado, como o escalão e o agrupar na lista de jogos: a fila
		     de letras e a dos dois modos eram duas linhas inteiras de botões por cima das tabelas. -->
		{#if opcoes.length || colunasEm(a)}
			<div class="controlos">
				{#if opcoes.length}
					<Escolha rotulo="Série" bind:valor={serie} {opcoes} />
				{/if}
				{#if colunasEm(a)}
					<Escolha rotulo="Colunas da tabela" bind:valor={completa} opcoes={COLUNAS} />
				{/if}
			</div>
		{/if}

		{#if a === 'classificacao' && temMerito}
			<ChapeuMerito />
			{#each visiveis as p (p.competicao.id)}
				{#if p.merito?.linhas.length}
					<section>
						{#if p.competicao.serie}<h2>Série {p.competicao.serie}</h2>{/if}
						<TabelaMerito
							linhas={p.merito.linhas} emblemas={data.emblemas}
							categoria={p.competicao.categoria} {destaque} />
					</section>
				{/if}
			{/each}
			<RegrasMerito />
			<LegendaMerito porConfirmar={meritoPorConfirmar} semBoletim={meritoSemBoletim} />
		{:else if a === 'classificacao'}
			<!-- Uma nota no fundo, e não uma por série: nas três séries dos Escolares eram três avisos
			     iguais empilhados. Vale para o ecrã, e por isso vive com as outras notas, lá em baixo. -->
			{@const algumaCalculada = visiveis.some((p) => tabelasDe(p.dados).calculada)}
			{#each visiveis as p (p.competicao.id)}
				{@const t = tabelasDe(p.dados)}
				{#each t.grupos as grupo, i (grupo.nome ?? i)}
					<section>
						<h2>{p.competicao.serie ? `Série ${p.competicao.serie}` : (grupo.nome ?? 'Classificação')}</h2>
						<TabelaClassificacao
							linhas={grupo.linhas} emblemas={data.emblemas}
							categoria={p.competicao.categoria} {completa} {destaque}
							assistencias={assistencias(p.quadro)} legenda={false} />
					</section>
				{/each}
			{/each}
			<LegendaClassificacao {completa} />
			<p class="nota">Vitória 3 pontos, empate 1. As séries não se enfrentam, por isso não há tabela única.</p>
			{#if algumaCalculada}<RotuloCalculada />{/if}
		{:else if a === 'calendario'}
			{#each visiveis as p (p.competicao.id)}
				{@const cal = jogosDaProva(p.dados.jogos)}
				<section>
					{#if p.competicao.serie}<h2>Série {p.competicao.serie}</h2>{/if}
					{#each cal.jornadas as [jornada, jogos] (jornada)}
						<p class="jornada" class:curso={jornada === cal.atual}>
							{jornada}{#if jornada === cal.atual}<span class="agora">em curso</span>{/if}
						</p>
						{#each jogos as j (j.id ?? `${j.casa}${j.fora}`)}
							<LinhaJogo jogo={paraAgenda(j, p.competicao.id, data.escalao)}
								emblemas={data.emblemas} seguida={destaque} comData />
						{/each}
					{/each}
				</section>
			{/each}
		{:else}
			{#if marcadores.length === 0}
				<p class="nota">Ainda não há fichas de jogo publicadas nesta competição.</p>
			{:else}
				<!-- A chave dos números, antes da lista: sem ela o total lê-se como se fosse de um jogo
				     só — ver o comentário do `jogosContados`. -->
				<p class="chave">
					Totais de <b>{jogosContados}</b>
					{jogosContados === 1 ? 'jogo' : 'jogos'} com ficha publicada: golos a
					<b>negrito</b>, assistências (<b>A</b>) e jogos de cada jogador (<b>j</b>).
				</p>
				<ol class="marcadores">
					{#each marcadores as m, i (m.equipa + m.nome)}
						<li class:minha={destaque(m.equipa)}>
							<span class="lugar">{i + 1}</span>
							<span class="quem">
								<span class="nome">{nomeProprio(m.nome)}</span>
								<span class="clube">
									{m.equipa}{#if m.serie}<span class="ser">série {m.serie}</span>{/if}
								</span>
							</span>
							<span class="numeros"><b>{m.golos}</b><span>{m.assistencias}A · {m.jogos}j</span></span>
						</li>
					{/each}
				</ol>
				{#if temSeries && !serie}
					<p class="nota">
						Somado entre séries. Como as séries não se enfrentam, os totais não são
						directamente comparáveis — a série de cada jogador está indicada.
					</p>
				{/if}
			{/if}
		{/if}
	{/snippet}
</Faixa>

<style>
	.titulo { margin-bottom: 0.8rem; }
	.escalao { font-size: 0.64rem; color: var(--acento); letter-spacing: 0.05em; margin: 0; }
	h1 { font-size: 1rem; margin: 0.1rem 0 0; }
	.quantas { font-size: 0.7rem; color: var(--suave); margin: 0.15rem 0 0; }

	/* De ponta a ponta do ecrã, como na ficha de jogo: o `main` tem 0.9rem de cada lado, e a
	   barra encolhida dentro dele lia-se como um cartão e não como a navegação do ecrã. */
	.barra { margin: 0 -0.9rem; }

	/* Meia largura cada, mesmo quando só há uma: mudar de separador não faz a série esticar e
	   encolher. O desenho de cada lista vive no `lib/Escolha.svelte`. */
	.controlos { display: flex; gap: var(--e-2); margin-bottom: 0.8rem; }
	.controlos > :global(label) { max-width: calc(50% - var(--e-2) / 2); }

	section { margin-bottom: 1.2rem; }
	h2 { font-size: 0.7rem; color: var(--suave); margin: 0 0 0.3rem; font-weight: 600; }

	/* vista simples por omissão: 5 colunas cabem a 375px sem rolar (W6.2) */

	.jornada { font-size: 0.66rem; color: var(--suave); margin: 0.6rem 0 0.1rem 0.2rem; }
	.jornada.curso { color: var(--acento); }
	.agora { margin-left: 0.35rem; padding: 0.02rem 0.3rem; border-radius: 999px;
		background: var(--acento); color: var(--cartao); font-size: 0.6rem; }

	.chave { margin: 0 0 var(--e-2); font-size: var(--t-pequeno); color: var(--suave);
		line-height: 1.4; }
	.chave b { color: var(--texto-2); font-weight: 600; }

	.marcadores { list-style: none; margin: 0; padding: 0; }
	.marcadores li { display: grid; grid-template-columns: 1.6rem 1fr auto;
		align-items: center; gap: 0.5rem; padding: 0.45rem 0.2rem;
		border-bottom: 1px solid var(--borda); }
	.marcadores li.minha { background: var(--acento-fraco); }
	.lugar { text-align: center; color: var(--suave); font-size: 0.72rem; }
	.quem { min-width: 0; }
	.nome { display: block; font-size: 0.8rem; overflow: hidden;
		text-overflow: ellipsis; white-space: nowrap; }
	.clube { display: block; font-size: 0.66rem; color: var(--suave); }
	.ser { margin-left: 0.3rem; }
	.numeros { text-align: right; }
	.numeros b { display: block; font-size: 0.92rem; font-variant-numeric: tabular-nums; }
	.numeros span { font-size: 0.62rem; color: var(--suave); }

	.nota { color: var(--suave); font-size: 0.7rem; margin-top: 0.7rem; }
</style>
