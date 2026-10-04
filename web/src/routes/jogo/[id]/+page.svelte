<script lang="ts">
	import BoletimOficial from '$lib/BoletimOficial.svelte';
	import Cronologia from '$lib/Cronologia.svelte';
	import Emblema from '$lib/Emblema.svelte';
	import FichaEquipas from '$lib/FichaEquipas.svelte';
	import Bola from '$lib/Bola.svelte';
	import Icone from '$lib/Icone.svelte';
	import { dataLonga, horaCurta, nomeProprio } from '$lib/formato';
	import { caminhoEquipa } from '$lib/slug';

	let { data } = $props();
	const f = $derived(data.ficha);

	type Tab = 'cronologia' | 'ficha' | 'boletim';
	let tab = $state<Tab>('cronologia');
	// num jogo a decorrer é a cronologia que se quer, não a ficha
	$effect(() => {
		if (aDecorrer) tab = 'cronologia';
	});

	// W3.6d: sem acontecimentos reais, a tab de cronologia seria um ecrã vazio
	const ESTRUTURA = new Set(['inicio_parte', 'fim_parte', 'fim_jogo', 'por_iniciar']);
	/**
	 * Num jogo a decorrer a cronologia mostra-se **sempre**, mesmo só com o apito inicial.
	 *
	 * A regra era "só se houver um evento que não seja estrutural", para não abrir uma tab
	 * vazia. Num jogo a decorrer isso está ao contrário: aos dois minutos ainda só há o
	 * "Início da 1ª Parte", e era precisamente aí que o utilizador abria o jogo à procura
	 * do que estava a acontecer — e não encontrava tab nenhuma.
	 */
	/** Nem terminado, nem por começar: está a acontecer alguma coisa.
	 *
	 *  A regra era "tem período", e o período vinha de um padrão que só reconhecia
	 *  "Nª Parte (relógio)". Ao intervalo a app ficava **sem sinal nenhum** de que o jogo
	 *  estava a decorrer — foi o que o utilizador viu. A fonte diz-o num campo próprio. */
	const FECHADO = new Set(['Jogo Terminado', 'Jogo Suspendido', 'Jogo Adiado']);
	const aDecorrer = $derived(
		!!f.situacao && !FECHADO.has(f.situacao) && !/come[çc]ar/i.test(f.situacao)
	);
	/** Nem começou: a ficha que existe é a convocatória, e as colunas estão todas a zero. */
	const porComecar = $derived(!aDecorrer && /come[çc]ar/i.test(f.situacao ?? ''));
	const temCronologia = $derived(
		aDecorrer || f.cronologia.some((e) => !ESTRUTURA.has(e.tipo))
	);
	const temFicha = $derived(f.equipas.some((e) => e.jogadores.length > 0));
	/** A tab do boletim só existe quando há boletim — e não há quase nunca: a fonte só o
	 *  anexa minutos depois do apito, e nunca nos escalões de formação. Oferecer uma tab
	 *  que abre vazia é pior do que não a ter. */
	const temBoletim = $derived(!!f.boletim?.parciais?.length);

	/** W7.2: marcadores por equipa, com minuto — vê-se quem marcou sem abrir a cronologia. */
	const marcadores = $derived.by(() => {
		const por = { casa: [] as string[], fora: [] as string[] };
		for (const e of f.cronologia) {
			if (e.tipo !== 'golo' || !e.jogador) continue;
			const rotulo = `${nomeProprio(e.jogador)}${e.minuto !== null ? ` ${e.minuto}'` : ''}`;
			if (e.equipa === f.casa) por.casa.push(rotulo);
			else if (e.equipa === f.fora) por.fora.push(rotulo);
		}
		return por;
	});
	const temMarcadores = $derived(marcadores.casa.length + marcadores.fora.length > 0);

	/** A fonte repete o escalão no nome da prova ("TAÇA ... - SENIORES MASCULINOS"), e na
	 *  migalha isso aparecia duas vezes seguidas. */
	const provaCurta = $derived.by(() => {
		const nome = f.grupo_nome ?? f.competicao ?? '';
		const cat = f.categoria;
		if (!cat) return nome;
		return nome.replace(new RegExp(`\\s*[-·]\\s*${cat}\\s*$`, 'i'), '').trim() || nome;
	});

	const migalhas = $derived(
		[f.categoria, provaCurta, f.serie ? `Série ${f.serie}` : null, f.jornada].filter(Boolean)
	);

	/** A fonte só publica o nome do recinto, que não geocodifica; a morada é nossa. */
	const morada = $derived(f.recinto ? (data.recintos?.[f.recinto] ?? null) : null);
	const linkMapa = $derived(
		morada ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(morada)}` : null
	);

	/**
	 * Barra compacta colada ao topo, com o resultado e o relógio, quando o cabeçalho já
	 * saiu do ecrã.
	 *
	 * Foi o pormenor que o Pedro destacou no vídeo do Sofascore, e resolve de vez a queixa
	 * dele de que o relógio "desaparecia": num jogo a decorrer passa-se o tempo a ler a
	 * cronologia, que é precisamente onde o cabeçalho já não se vê. Pôr o relógio em
	 * destaque no topo não bastava — tem de continuar lá depois de se rolar.
	 *
	 * O gatilho é uma sentinela no fim do cabeçalho, e não o `scrollY`: assim não há
	 * nenhum número de píxeis escrito à mão que deixe de servir quando o cabeçalho muda
	 * de altura (um nome comprido, uma faixa de "ao vivo" a mais).
	 */
	let compacto = $state(false);
	let sentinela = $state<HTMLElement | null>(null);
	$effect(() => {
		const alvo = sentinela;
		if (!alvo || typeof IntersectionObserver === 'undefined') return;
		let obs: IntersectionObserver;
		const ligar = () => {
			obs?.disconnect();
			// `--topo` é a altura real do cabeçalho do layout, medida lá e herdada até aqui
			const topo = parseFloat(getComputedStyle(alvo).getPropertyValue('--topo')) || 96;
			obs = new IntersectionObserver(
				([e]) => (compacto = !e.isIntersecting && e.boundingClientRect.top < 0),
				{ rootMargin: `-${Math.round(topo)}px 0px 0px 0px` }
			);
			obs.observe(alvo);
		};
		ligar();
		addEventListener('resize', ligar);
		return () => {
			obs?.disconnect();
			removeEventListener('resize', ligar);
		};
	});
</script>

<svelte:head><title>{f.casa} {f.golos_casa}–{f.golos_fora} {f.fora}</title></svelte:head>

<a class="voltar" href="/">← Jogos</a>

<!-- decorativa: o cabeçalho logo abaixo diz o mesmo, e melhor, a quem lê por voz -->
<div class="barra" class:visivel={compacto} aria-hidden="true">
	<div class="interior">
		<Emblema equipa={f.casa} src={data.emblemas[f.casa]} tamanho={20} />
		<span class="res">{f.golos_casa}<span class="tr">–</span>{f.golos_fora}</span>
		<Emblema equipa={f.fora} src={data.emblemas[f.fora]} tamanho={20} />
		{#if aDecorrer}
			<span class="rel"><i></i>{f.relogio ?? f.periodo ?? f.situacao}</span>
		{/if}
	</div>
</div>

<article class="cabecalho">
	{#if aDecorrer}
		<!-- Acima do resultado e em faixa própria. Estava debaixo dos números a 0,6rem —
		     9 píxeis — e o utilizador disse que "desapareceu de todo". Num jogo a decorrer
		     o período e o relógio são a segunda coisa mais importante do ecrã, depois do
		     resultado: é o que diz se ainda há jogo para jogar. -->
		<p class="aovivo">
			<i aria-hidden="true"></i>AO VIVO
			<strong>{f.periodo ?? f.situacao}</strong>{#if f.relogio}<span class="conta">{f.relogio}</span>{/if}
		</p>
	{/if}

	<div class="placar">
		<svelte:element this={f.categoria ? 'a' : 'span'}
			href={f.categoria ? caminhoEquipa(f.casa, f.categoria) : null}
			class="equipa" class:venceu={(f.golos_casa ?? 0) > (f.golos_fora ?? 0)}>
			<Emblema equipa={f.casa} src={data.emblemas[f.casa]} tamanho={30} />
			<span class="nome">{f.casa}</span>
		</svelte:element>
		<span class="numeros">{f.golos_casa}<span class="tr">–</span>{f.golos_fora}</span>
		<svelte:element this={f.categoria ? 'a' : 'span'}
			href={f.categoria ? caminhoEquipa(f.fora, f.categoria) : null}
			class="equipa" class:venceu={(f.golos_fora ?? 0) > (f.golos_casa ?? 0)}>
			<Emblema equipa={f.fora} src={data.emblemas[f.fora]} tamanho={30} />
			<span class="nome">{f.fora}</span>
		</svelte:element>
	</div>

	{#if temMarcadores}
		<div class="marcadores">
			<ul>{#each marcadores.casa as m, i (i)}<li>{m}</li>{/each}</ul>
			<Bola tamanho={13} />
			<ul class="dir">{#each marcadores.fora as m, i (i)}<li>{m}</li>{/each}</ul>
		</div>
	{/if}

</article>
<!-- sentinela da barra compacta: quando esta linha sai por cima, a barra entra -->
<div bind:this={sentinela} class="sentinela" aria-hidden="true"></div>

<!--
  Tudo o que diz respeito ao jogo numa caixa só, um ícone por linha.
  Antes era a migalha da competição num cartão e, solta dentro do cabeçalho, data, hora,
  recinto, faltas e arbitragem em três linhas de 0,74rem — a informação estava lá, mas
  arrumada em dois sítios e a competir com o resultado.
  A morada é a única linha nova: temos as moradas dos 29 recintos e até aqui só serviam o
  botão do calendário, pelo que a app nunca teve forma de levar ninguém ao pavilhão.
  W7.3: a primeira linha continua a ser o caminho de volta à competição.
-->
<ul class="info">
	<li>
		<Icone nome="prova" />
		<a class="trilho" href={f.grupo_id ? `/competicoes/${f.grupo_id}` : '/competicoes'}>
			<span class="migalhas"
				>{#each migalhas as m, i (m)}{#if i}<span class="sep">›</span
					>{/if}<span class:escalao={i === 0}>{m}</span>{/each}</span
			>
			<span class="seta" aria-hidden="true">›</span>
		</a>
	</li>
	{#if f.data || f.hora}
		<li>
			<Icone nome="data" />
			<!-- os espaços em volta do ponto têm de ser entidades: o compilador apara o
			     espaço em branco que fica colado a uma etiqueta, e saía "outubro·16:45" -->
			<span
				>{f.data ? dataLonga(f.data) : ''}{#if f.data && f.hora}&nbsp;·&nbsp;{/if}{#if f.hora}{horaCurta(
						f.hora
					)}{/if}</span
			>
		</li>
	{/if}
	{#if f.recinto}
		<li><Icone nome="recinto" /><span>{f.recinto}</span></li>
	{/if}
	{#if morada && linkMapa}
		<li>
			<Icone nome="local" />
			<a class="trilho" href={linkMapa} rel="external noopener" target="_blank">
				<span>{morada}</span>
				<span class="seta" aria-hidden="true">›</span>
			</a>
		</li>
	{/if}
	{#if f.arbitros.length}
		<li>
			<Icone nome="arbitro" />
			<span>{f.arbitros.map(nomeProprio).join(', ')}</span>
		</li>
	{/if}
	{#if f.faltas[0] !== null}
		<li>
			<Icone nome="faltas" />
			<span>Faltas de equipa: {f.faltas[0]}–{f.faltas[1]}</span>
		</li>
	{/if}
</ul>

{#if temCronologia || temFicha || temBoletim}
	<div class="tabs" role="tablist">
		{#if temCronologia}
			<button role="tab" aria-selected={tab === 'cronologia'} onclick={() => (tab = 'cronologia')}>
				Cronologia
			</button>
		{/if}
		{#if temFicha}
			<button role="tab" aria-selected={tab === 'ficha'} onclick={() => (tab = 'ficha')}>
				<!-- num jogo por começar chamar-lhe "Ficha" engana: os zeros nas colunas de
				     golos parecem resultado, quando são só a convocatória -->
				{porComecar ? 'Convocados' : 'Ficha'}
			</button>
		{/if}
		{#if temBoletim}
			<button role="tab" aria-selected={tab === 'boletim'} onclick={() => (tab = 'boletim')}>
				Boletim
			</button>
		{/if}
	</div>

	{#if tab === 'boletim' && temBoletim && f.boletim}
		<BoletimOficial boletim={f.boletim} casa={f.casa} fora={f.fora} />
	{:else if tab === 'cronologia' && temCronologia}
		<Cronologia eventos={f.cronologia} casa={f.casa} fora={f.fora}
		omitidos={f.individuais_omitidos ?? false} />
	{:else if temFicha}
		{#if porComecar}
			<p class="aviso">
				Este jogo ainda não começou. Esta é a <strong>convocatória</strong> publicada pela
				associação, e pode mudar até ao apito inicial.
			</p>
		{/if}
		<FichaEquipas equipas={f.equipas} {porComecar} />
	{:else if temBoletim && f.boletim}
		<BoletimOficial boletim={f.boletim} casa={f.casa} fora={f.fora} />
	{/if}
{:else}
	<p class="vazio">Este jogo não tem detalhe publicado.</p>
{/if}

<style>
	.voltar { display: inline-block; font-size: 0.82rem; color: var(--suave);
		text-decoration: none; margin-bottom: 0.8rem; min-height: 44px; line-height: 44px; }
	.cabecalho { background: var(--cartao); border: 1px solid var(--borda);
		border-radius: 12px; padding: 1rem 0.9rem; margin-bottom: 1rem; text-align: center; }
	.placar { display: grid; grid-template-columns: 1fr auto 1fr; align-items: start; gap: 0.6rem; }
	.equipa { display: flex; flex-direction: column; align-items: center; gap: 0.3rem;
		font-size: 0.8rem; min-width: 0; text-decoration: none; color: inherit; }
	/* leva à equipa, mas sem se vestir de link: o sublinhado num nome centrado debaixo
	   de um emblema fica a competir com o resultado, que é o que se vem aqui ver */
	a.equipa:hover .nome, a.equipa:focus-visible .nome { text-decoration: underline; }
	.equipa .nome { overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
		max-width: 100%; }
	.marcadores { display: grid; grid-template-columns: 1fr auto 1fr; gap: 0.5rem;
		align-items: start; margin-top: 0.7rem; }
	.marcadores ul { list-style: none; margin: 0; padding: 0; text-align: right;
		font-size: 0.72rem; color: var(--suave); }
	.marcadores ul.dir { text-align: left; }
	/* a sentinela não ocupa espaço: é só uma posição no documento */
	.sentinela { height: 0; }

	.info { list-style: none; margin: 0 0 0.9rem; padding: 0.2rem 0.7rem;
		border: 1px solid var(--borda); border-radius: 10px; background: var(--cartao); }
	.info li { display: flex; align-items: center; gap: 0.55rem; min-height: 40px;
		padding: 0.3rem 0; font-size: 0.78rem; line-height: 1.35; }
	.info li + li { border-top: 1px solid var(--borda); }
	.info li > span { min-width: 0; }
	/* linhas que levam a algum lado ocupam a largura toda, com a seta encostada à direita */
	.info a.trilho { display: flex; align-items: center; justify-content: space-between;
		gap: 0.4rem; flex: 1; min-width: 0; text-decoration: none; color: inherit; }
	.info a.trilho:hover span, .info a.trilho:focus-visible span { text-decoration: underline; }
	.migalhas { display: flex; flex-wrap: wrap; align-items: center; gap: 0.3rem; min-width: 0;
		color: var(--suave); }
	.migalhas .escalao { color: var(--acento); font-weight: 600; }
	.sep { color: var(--borda); }
	.seta { color: var(--suave); }

	/* Barra compacta: fixa, e não `sticky`. Em `sticky` aparecer e desaparecer empurrava
	   o conteúdo para baixo e para cima a cada passagem pelo limiar. Fica debaixo do
	   cabeçalho do layout (z-index 10) e por cima do resto. */
	.barra {
		position: fixed; inset: var(--topo, 96px) 0 auto 0; z-index: 9;
		background: var(--fundo); border-bottom: 1px solid var(--borda);
		opacity: 0; transform: translateY(-6px); pointer-events: none;
		transition: opacity 0.16s ease, transform 0.16s ease;
	}
	.barra.visivel { opacity: 1; transform: none; pointer-events: auto; }
	.interior { display: flex; align-items: center; justify-content: center; gap: 0.45rem;
		max-width: 44rem; margin: 0 auto; padding: 0.35rem 0.9rem; }
	.barra .res { font-size: 1.05rem; font-weight: 700; font-variant-numeric: tabular-nums; }
	.barra .rel { display: inline-flex; align-items: center; gap: 0.3rem; margin-left: 0.3rem;
		font-size: 0.8rem; font-weight: 700; color: var(--vivo);
		font-variant-numeric: tabular-nums; }
	.barra .rel i { width: 6px; height: 6px; border-radius: 50%; background: var(--vivo);
		animation: pulsar 1.6s ease-in-out infinite; }
	.venceu { font-weight: 700; }
	.aovivo {
		display: flex; align-items: center; justify-content: center; flex-wrap: wrap;
		gap: 0.3rem 0.45rem; margin: 0 0 0.7rem; padding: 0.35rem 0.7rem;
		font-size: 0.7rem; font-weight: 700; letter-spacing: 0.05em;
		color: var(--vivo); border: 1px solid var(--vivo); border-radius: 999px;
	}
	.aovivo i { width: 7px; height: 7px; border-radius: 50%; background: var(--vivo);
		animation: pulsar 1.6s ease-in-out infinite; }
	@keyframes pulsar { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
	@media (prefers-reduced-motion: reduce) { .aovivo i { animation: none; } }
	.aovivo strong { font-weight: 700; letter-spacing: 0; }
	/* o relógio em números tabulares, senão dança a cada segundo que muda de largura */
	.aovivo .conta { font-size: 0.86rem; font-weight: 700; letter-spacing: 0;
		font-variant-numeric: tabular-nums; }
	.numeros { font-size: 1.7rem; font-weight: 700; font-variant-numeric: tabular-nums; }
	.tr { color: var(--suave); margin: 0 0.25rem; font-weight: 400; }
	.tabs { display: flex; gap: 0.3rem; margin-bottom: 0.9rem; }
	.tabs button {
		flex: 1; min-height: 44px; padding: 0.5rem; font-size: 0.85rem; cursor: pointer;
		border-radius: 8px; border: 1px solid var(--borda);
		background: var(--cartao); color: var(--suave);
	}
	.tabs button[aria-selected='true'] { color: var(--acento); border-color: var(--acento);
		font-weight: 600; }
	.aviso { margin: 0 0 0.8rem; padding: 0.6rem 0.7rem; font-size: 0.76rem; line-height: 1.45;
		border-radius: 8px; background: var(--aviso-fundo); color: var(--aviso); }
	.vazio { color: var(--suave); font-size: 0.85rem; }
</style>
