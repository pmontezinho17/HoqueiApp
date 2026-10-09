<script lang="ts">
	/**
	 * O menu de Competições: uma grelha de escalões, três por linha.
	 *
	 * **Era uma lista de vinte linhas de texto** e o dono pediu a mesma forma que o ecrã de
	 * escolha de equipas já usa: *"três logotipos por linha... e neste caso teríamos os
	 * emblemas de cada escalão"*. Os onze SVG estão em `static/escaloes/` desde 05/10.
	 *
	 * **O desdobramento só existe onde é preciso.** Medido a 09/10/2026: dos nove escalões,
	 * sete têm uma só prova a decorrer e dois — Escolares e Benjamins — têm duas, os níveis I
	 * e II. Tocar num escalão de prova única entra directamente nela; tocar num de duas abre as
	 * duas. Obrigar toda a gente a um toque a mais para servir dois casos em nove seria pagar
	 * com o dedo de todos o problema de alguns.
	 *
	 * **E abre no sítio, por baixo da linha do escalão tocado**, empurrando as linhas de baixo
	 * — pedido do dono a 09/10. A primeira versão trocava o ecrã todo por uma lista, e isso
	 * custa o contexto: deixava de se ver onde se estava e obrigava a voltar atrás para mudar
	 * de ideias. O painel fica entre duas linhas da grelha e o escalão aberto continua à vista,
	 * marcado.
	 *
	 * **O que conta para "mais do que uma" é o que está a decorrer**, como ele notou — uma
	 * prova acabada não é uma escolha. Com o interruptor ligado, as acabadas voltam e um
	 * escalão de prova única pode passar a ter três; aí desdobra-se na mesma, porque a regra
	 * olha para o que está à vista e não para uma contagem fixa.
	 *
	 * ## O que se manteve do que estava
	 *
	 * Por omissão só o que está a decorrer (P12.1). Medido a 08/10: das 20 entradas, 9 não
	 * tinham um único jogo por disputar. **O que se tira é contado e tem porta de entrada** —
	 * a 06/10 escondi escalões no ecrã de equipas e as seniores do HC SINTRA desapareceram.
	 *
	 * O escalão aberto vive no endereço e não em estado do componente: assim o botão de voltar
	 * do telemóvel fecha o desdobramento em vez de sair da aplicação.
	 */
	import CrachaEscalao from '$lib/CrachaEscalao.svelte';
	import { competicoesVivas } from '$lib/clubes';
	import { agruparProvas, enderecoDoMenu, filtrarProvas } from '$lib/provas';
	import { APP_NOME } from '$lib/sitio';
	import { slug } from '$lib/slug';
	import type { Competicao } from '$lib/tipos';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';

	let { data } = $props();

	/** Sai da agenda que o `+layout.ts` já carregou: não custa um pedido. */
	const vivas = $derived(
		competicoesVivas(data.agenda as { comp: number; gc: number | null }[])
	);
	const tudo = $derived(agruparProvas(data.indice.competicoes as Competicao[], vivas));

	// **O estado do ecrã vive todo no endereço**, e não em memória do componente. Era `$state`
	// e isso criava uma incoerência que só aparece a recarregar: abria-se um escalão com "3
	// provas", a página recarregava — por um refrescamento ou por voltar atrás — e o
	// desdobramento passava a mostrar uma, porque o interruptor tinha esquecido. No endereço,
	// o que se vê é sempre o que o endereço diz.
	//
	// **Liga-se sozinho quando nada está a decorrer.** Em fim de época, ou com uma agenda que
	// não se leu, um menu filtrado ficava vazio — e um ecrã vazio não é uma resposta.
	const pedido = $derived(page.url.searchParams.get('tudo') === '1');
	const mostrarTudo = $derived(pedido || tudo.nadaVivo);
	const lista = $derived(filtrarProvas(tudo.escaloes, mostrarTudo));

	const aberto = $derived(page.url.searchParams.get('escalao'));

	/** Três por linha, como manda o CSS. Se a grelha mudar de colunas, isto muda com ela. */
	const COLUNAS = 3;
	/**
	 * O índice do último cartão da linha onde está o escalão aberto — é a seguir a esse que o
	 * painel entra. `-1` quando não há nada aberto.
	 *
	 * O `Math.min` é para a última linha, que pode estar incompleta: com nove escalões e três
	 * colunas não acontece, mas com dez acontecia, e aí o painel nunca aparecia.
	 */
	const fimDaLinhaAberta = $derived.by(() => {
		const i = lista.findIndex(([e]) => slug(e) === aberto);
		if (i < 0) return -1;
		return Math.min(Math.floor(i / COLUNAS) * COLUNAS + COLUNAS - 1, lista.length - 1);
	});

	/** O endereço deste ecrã com uma coisa trocada e o resto preservado. @see lib/provas.ts */
	const endereco = (troca: { escalao?: string | null; tudo?: boolean }) =>
		enderecoDoMenu({
			escalao: troca.escalao === undefined ? aberto : troca.escalao,
			tudo: troca.tudo === undefined ? pedido : troca.tudo
		});

	/**
	 * Tocar num escalão: entra directamente quando só há uma prova à vista; caso contrário
	 * abre o painel — e fecha-o se já estava aberto, que é o que um dedo espera de um botão
	 * que abriu alguma coisa.
	 */
	function tocar(escalao: string, provas: { id: string }[]) {
		if (provas.length === 1) goto(`/competicoes/${provas[0].id}`);
		else goto(endereco({ escalao: slug(escalao) === aberto ? null : slug(escalao) }));
	}
</script>

<svelte:head><title>Competições — {APP_NOME}</title></svelte:head>

<h1 class="sr">Competições</h1>

{#if tudo.nadaVivo}
	<p class="nota">Não há provas a decorrer. Em baixo está a época toda.</p>
{:else if tudo.terminadas}
	<!-- um link e não um botão: isto muda o endereço, e um link é o que o browser sabe
	     guardar, partilhar e desfazer com o botão de voltar -->
	<a class="interruptor" href={endereco({ tudo: !pedido })}>
		{pedido
			? 'mostrar só o que está a decorrer'
			: `mostrar também as ${tudo.terminadas} que já acabaram`}
	</a>
{/if}

<ul class="grelha">
	{#each lista as [escalao, provas], i (escalao)}
		{@const estaAberto = slug(escalao) === aberto && provas.length > 1}
		<li>
			<button
				class="escalao"
				class:aberto={estaAberto}
				aria-expanded={provas.length > 1 ? estaAberto : undefined}
				onclick={() => tocar(escalao, provas)}
			>
				<CrachaEscalao categoria={escalao} tamanho={56} />
				<span class="cat">{escalao}</span>
				<!-- o número só aparece quando há escolha a fazer: "1 prova" é ruído -->
				<span class="quantas">{provas.length > 1 ? `${provas.length} provas` : ''}</span>
			</button>
		</li>

		<!--
			O painel entra **a seguir ao último cartão da linha** do escalão aberto, e não a
			seguir ao próprio cartão: num `grid` de três colunas, metê-lo no meio da linha
			partia-a ao meio. Daí a conta do fim da linha.

			As três colunas são fixas em todas as larguras — ver o CSS. Se um dia deixarem de
			ser, esta conta tem de mudar com elas.
		-->
		{#if aberto && i === fimDaLinhaAberta}
			{@const dentro = lista.find(([e]) => slug(e) === aberto)}
			{#if dentro && dentro[1].length > 1}
				<li class="painel">
					{#each dentro[1] as g (g.id)}
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
				</li>
			{/if}
		{/if}
	{/each}
</ul>

<style>
	/* três por linha, como no ecrã de escolha de equipas */
	.grelha {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--e-2);
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.escalao {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.3rem;
		width: 100%;
		min-height: 6.6rem;
		padding: 0.7rem 0.35rem;
		font: inherit;
		color: var(--texto);
		background: var(--cartao, transparent);
		border: 1px solid var(--borda);
		border-radius: 0.75rem;
		cursor: pointer;
	}
	.escalao:hover, .escalao:focus-visible { background: var(--acento-fraco); outline: none; }
	.escalao:active { transform: scale(0.98); }
	@media (prefers-reduced-motion: reduce) { .escalao:active { transform: none; } }

	.cat {
		font-size: 0.62rem;
		font-weight: 600;
		letter-spacing: 0.02em;
		line-height: 1.2;
		text-align: center;
		/* "SENIORES MASCULINOS" não cabe numa linha a 375px e não deve ser cortado */
		overflow-wrap: anywhere;
	}
	.quantas { font-size: 0.58rem; color: var(--suave); min-height: 0.8rem; }
	.escalao.aberto .quantas { color: var(--acento); font-weight: 600; }

	/* O painel ocupa a linha toda da grelha e entra a seguir ao último cartão da linha do
	   escalão aberto — ver o comentário na maquete. */
	.painel {
		grid-column: 1 / -1;
		padding: 0.1rem 0.7rem 0.4rem;
		background: var(--acento-fraco);
		border: 1px solid var(--borda);
		border-radius: 0.75rem;
	}
	/* o cartão aberto fica marcado: sem isto, com a grelha a empurrar-se, perde-se de vista
	   qual deles abriu o painel */
	.escalao.aberto {
		border-color: var(--acento);
		background: var(--acento-fraco);
	}

	.prova { display: block; padding: 0.55rem 0.2rem; text-decoration: none;
		border-bottom: 1px solid var(--borda); }
	.prova:hover, .prova:focus-visible { background: var(--borda); outline: none; }
	.painel .prova:last-child { border-bottom: 0; }
	.nome { display: block; font-size: 0.85rem; }
	.series { display: block; font-size: 0.68rem; color: var(--suave); margin-top: 0.1rem; }

	/* "terminada" é **palavra e não só cor**: a mesma regra da consola, e a mesma razão */
	.acabou { font-style: normal; font-size: 0.6rem; text-transform: uppercase;
		letter-spacing: 0.04em; color: var(--suave); border: 1px solid var(--borda);
		border-radius: 0.5rem; padding: 0.05rem 0.3rem; margin-left: 0.3rem;
		vertical-align: 0.1em; }

	.interruptor { display: block; width: 100%; margin: 0 0 0.8rem; padding: 0.5rem;
		font: inherit; font-size: 0.72rem; color: var(--suave); text-align: center;
		text-decoration: none;
		background: none; border: 1px dashed var(--borda); border-radius: 0.5rem;
		cursor: pointer; }
	.interruptor:hover, .interruptor:focus-visible { color: var(--texto);
		border-style: solid; outline: none; }
	.nota { font-size: 0.72rem; color: var(--suave); margin: 0 0 0.8rem; }
</style>
