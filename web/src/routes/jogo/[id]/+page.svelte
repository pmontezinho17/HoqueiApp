<script lang="ts">
	import Cronologia from '$lib/Cronologia.svelte';
	import Emblema from '$lib/Emblema.svelte';
	import FichaEquipas from '$lib/FichaEquipas.svelte';
	import TabelaClassificacao from '$lib/TabelaClassificacao.svelte';
	import InfoJogo from './InfoJogo.svelte';
	import { nomeProprio, nomeProva } from '$lib/formato';
	import { caminhoEquipa } from '$lib/slug';
	import type { EventoJogo } from '$lib/tipos';

	let { data } = $props();
	const f = $derived(data.ficha);

	// W3.6d: sem acontecimentos reais, a tab de eventos seria um ecrã vazio
	const ESTRUTURA = new Set(['inicio_parte', 'fim_parte', 'fim_jogo', 'por_iniciar']);
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

	/**
	 * Num jogo a decorrer a cronologia mostra-se **sempre**, mesmo só com o apito inicial.
	 * A regra era "só se houver um evento que não seja estrutural", e isso está ao contrário
	 * num jogo a decorrer: aos dois minutos ainda só há o "Início da 1ª Parte", e era
	 * precisamente aí que se abria o jogo à procura do que estava a acontecer.
	 */
	const temEventos = $derived(aDecorrer || f.cronologia.some((e) => !ESTRUTURA.has(e.tipo)));
	const temEquipas = $derived(f.equipas.some((e) => e.jogadores.length > 0));
	const temInfo = $derived(
		!!(f.data || f.hora || f.recinto || f.arbitros.length || f.boletim?.parciais?.length)
	);
	/** Há provas sem tabela publicada — todos os Escolares e Benjamins. Aí não há separador. */
	const grupos = $derived(data.competicao?.classificacao ?? []);
	const temTabela = $derived(grupos.some((g) => g.linhas.length > 0));

	type Tab = 'eventos' | 'tabela' | 'equipas' | 'info';
	let tab = $state<Tab>('eventos');
	// num jogo a decorrer é a cronologia que se quer, não a ficha
	$effect(() => {
		if (aDecorrer) tab = 'eventos';
	});

	/**
	 * Os golos por ordem de jogo, com o resultado ao momento e a marca de mudança de parte.
	 *
	 * Era uma lista por equipa, de um lado e do outro. Assim lê-se a história do jogo de
	 * cima para baixo — quem marcou, quando, e como é que o resultado foi andando — que é
	 * o que se quer ver num cabeçalho sem ter de abrir nada.
	 */
	const golos = $derived.by(() => {
		const linhas: Array<
			| { tipo: 'golo'; minuto: number | null; quem: string; gc: number; gf: number; casa: boolean }
			| { tipo: 'parte'; rotulo: string }
		> = [];
		let parte = 1;
		for (const e of f.cronologia as EventoJogo[]) {
			if (e.tipo === 'inicio_parte' && e.parte && e.parte > parte) {
				parte = e.parte;
				if (linhas.length) linhas.push({ tipo: 'parte', rotulo: `${parte}ª parte` });
				continue;
			}
			if (e.tipo !== 'golo' || e.golos_casa === null || e.golos_fora === null) continue;
			linhas.push({
				tipo: 'golo',
				minuto: e.minuto,
				quem: e.jogador ? nomeProprio(e.jogador) : '',
				gc: e.golos_casa,
				gf: e.golos_fora,
				casa: e.equipa === f.casa
			});
		}
		return linhas;
	});
	/** Um 21–7 são 28 linhas: no cabeçalho isso empurra tudo para fora do ecrã. */
	const LIMITE = 5;
	const golosVisiveis = $derived(golos.slice(0, LIMITE));
	const golosEscondidos = $derived(golos.filter((l) => l.tipo === 'golo').length
		- golosVisiveis.filter((l) => l.tipo === 'golo').length);

	/** A fonte repete o escalão no nome da prova ("TAÇA ... - SENIORES MASCULINOS"). */
	const provaCurta = $derived.by(() => {
		const nome = f.grupo_nome ?? f.competicao ?? '';
		if (!f.categoria) return nome;
		return nome.replace(new RegExp(`\\s*[-·]\\s*${f.categoria}\\s*$`, 'i'), '').trim() || nome;
	});

	/** A fonte só publica o nome do recinto, que não geocodifica; a morada é nossa. */
	const morada = $derived(f.recinto ? (data.recintos?.[f.recinto] ?? null) : null);
	const linkMapa = $derived(
		morada ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(morada)}` : null
	);

	/**
	 * O herói colapsa, e o que fica nunca desaparece.
	 *
	 * Num jogo a decorrer passa-se o tempo a ler os eventos, que é precisamente onde o
	 * cabeçalho já não se vê — e foi essa a queixa. O gatilho é uma sentinela no fim do
	 * herói, e não o `scrollY`: assim não há nenhum número de píxeis escrito à mão que
	 * deixe de servir quando o herói muda de altura (mais golos, um nome comprido).
	 */
	let compacto = $state(false);
	let sentinela = $state<HTMLElement | null>(null);
	/** altura da barra, medida — é por baixo dela que os separadores se colam */
	let alturaBarra = $state(35);
	$effect(() => {
		const alvo = sentinela;
		if (!alvo || typeof IntersectionObserver === 'undefined') return;
		let obs: IntersectionObserver;
		const ligar = () => {
			obs?.disconnect();
			const topo = parseFloat(getComputedStyle(alvo).getPropertyValue('--topo')) || 60;
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

	const estado = $derived(
		aDecorrer ? (f.relogio ?? f.periodo ?? f.situacao ?? 'Ao vivo')
			: porComecar ? 'Por começar'
			: 'Final'
	);
</script>

<svelte:head><title>{f.casa} {f.golos_casa}–{f.golos_fora} {f.fora}</title></svelte:head>

<!-- decorativa: o herói logo abaixo diz o mesmo, e melhor, a quem lê por voz -->
<div class="compacta" class:visivel={compacto} bind:clientHeight={alturaBarra} aria-hidden="true">
	<div class="interior">
		<Emblema equipa={f.casa} src={data.emblemas[f.casa]} tamanho={22} />
		<span class="res">{f.golos_casa}<span class="tr">–</span>{f.golos_fora}</span>
		<Emblema equipa={f.fora} src={data.emblemas[f.fora]} tamanho={22} />
		<span class="estado" class:vivo={aDecorrer}>
			{#if aDecorrer}<i aria-hidden="true"></i>{/if}{estado}
		</span>
	</div>
</div>

<article class="heroi">
	<a class="voltar" href="/" aria-label="Voltar aos jogos">←</a>

	<div class="placar">
		<svelte:element this={f.categoria ? 'a' : 'span'}
			href={f.categoria ? caminhoEquipa(f.casa, f.categoria) : null} class="equipa">
			<Emblema equipa={f.casa} src={data.emblemas[f.casa]} tamanho={44} />
			<span class="nome">{f.casa}</span>
		</svelte:element>

		<span class="centro">
			<span class="numeros">{f.golos_casa}<span class="tr">–</span>{f.golos_fora}</span>
			<span class="estado" class:vivo={aDecorrer}>
				{#if aDecorrer}<i aria-hidden="true"></i>{/if}{estado}
			</span>
		</span>

		<svelte:element this={f.categoria ? 'a' : 'span'}
			href={f.categoria ? caminhoEquipa(f.fora, f.categoria) : null} class="equipa">
			<Emblema equipa={f.fora} src={data.emblemas[f.fora]} tamanho={44} />
			<span class="nome">{f.fora}</span>
		</svelte:element>
	</div>

	{#if golosVisiveis.length}
		<ul class="golos">
			{#each golosVisiveis as l, i (i)}
				{#if l.tipo === 'parte'}
					<li class="parte"><span>{l.rotulo}</span></li>
				{:else}
					<li>
						<span class="texto">
							<span class="minuto">{l.minuto !== null ? `${l.minuto}'` : ''}</span>
							<span class="quem">{l.quem}</span>
						</span>
						<span class="conta">
							<b class:marcou={l.casa}>{l.gc}</b><i>-</i><b class:marcou={!l.casa}>{l.gf}</b>
						</span>
					</li>
				{/if}
			{/each}
			{#if golosEscondidos > 0}
				<li class="mais">
					<button onclick={() => (tab = 'eventos')}>e mais {golosEscondidos} golos</button>
				</li>
			{/if}
		</ul>
	{/if}

	<!-- W7.3: o caminho de volta à competição, agora dentro do herói -->
	<a class="prova" href={f.grupo_id ? `/competicoes/${f.grupo_id}` : '/competicoes'}>
		<span class="texto">
			<span class="escalao">{f.categoria ?? ''}</span>
			<span class="nome">{nomeProva(provaCurta)}</span>
		</span>
		<span class="jornada">
			{f.serie ? `Série ${f.serie}` : ''}{#if f.serie && f.jornada}&nbsp;·&nbsp;{/if}{f.jornada ?? ''}
			<span class="seta" aria-hidden="true">→</span>
		</span>
	</a>
</article>
<div bind:this={sentinela} class="sentinela" aria-hidden="true"></div>

{#if temEventos || temTabela || temEquipas || temInfo}
	<div class="tabs" role="tablist" style="--barra: {alturaBarra}px">
		{#if temEventos}
			<button role="tab" aria-selected={tab === 'eventos'} onclick={() => (tab = 'eventos')}>
				Eventos
			</button>
		{/if}
		{#if temTabela}
			<button role="tab" aria-selected={tab === 'tabela'} onclick={() => (tab = 'tabela')}>
				Classificação
			</button>
		{/if}
		{#if temEquipas}
			<button role="tab" aria-selected={tab === 'equipas'} onclick={() => (tab = 'equipas')}>
				<!-- num jogo por começar chamar-lhe "Equipas" engana menos do que "Ficha":
				     os zeros nas colunas parecem resultado, quando são só a convocatória -->
				{porComecar ? 'Convocados' : 'Equipas'}
			</button>
		{/if}
		{#if temInfo}
			<button role="tab" aria-selected={tab === 'info'} onclick={() => (tab = 'info')}>
				Informações
			</button>
		{/if}
	</div>

	{#if tab === 'eventos' && temEventos}
		<Cronologia eventos={f.cronologia} casa={f.casa} fora={f.fora}
			omitidos={f.individuais_omitidos ?? false} />
	{:else if tab === 'tabela' && temTabela}
		{#each grupos as g (g.nome ?? '')}
			{#if g.linhas.length}
				{#if g.nome}<h2 class="serie">{g.nome}</h2>{/if}
				<TabelaClassificacao linhas={g.linhas} emblemas={data.emblemas}
					categoria={f.categoria ?? ''}
					destaque={(e) => e === f.casa || e === f.fora} />
			{/if}
		{/each}
	{:else if tab === 'equipas' && temEquipas}
		{#if porComecar}
			<p class="aviso">
				Este jogo ainda não começou. Esta é a <strong>convocatória</strong> publicada pela
				associação, e pode mudar até ao apito inicial.
			</p>
		{/if}
		<FichaEquipas equipas={f.equipas} {porComecar} />
	{:else if tab === 'info' && temInfo}
		<InfoJogo {f} {morada} {linkMapa} />
	{/if}
{:else}
	<p class="vazio">Este jogo não tem detalhe publicado.</p>
{/if}

<style>
	/* ---------------------------------------------------------------- o herói */
	.heroi {
		/* de ponta a ponta: sai do recuo de 0.9rem do `main` */
		position: relative;
		margin: calc(var(--e-4) * -1) -0.9rem var(--e-4);
		padding: var(--e-5) var(--e-4) var(--e-4);
		background: var(--heroi);
		color: var(--heroi-texto);
		text-align: center;
	}
	/* absoluta: num bloco centrado, `margin-right: auto` não encosta nada à esquerda */
	.voltar {
		position: absolute; left: var(--e-1); top: var(--e-1);
		display: inline-flex; align-items: center; justify-content: center;
		width: 44px; height: 44px;
		font-size: var(--t-destaque); text-decoration: none;
		color: var(--heroi-texto);
	}
	.placar {
		display: grid; grid-template-columns: 1fr auto 1fr;
		align-items: start; gap: var(--e-3);
	}
	.equipa {
		display: flex; flex-direction: column; align-items: center; gap: var(--e-2);
		min-width: 0; text-decoration: none; color: inherit;
		font-size: var(--t-base);
	}
	.equipa .nome {
		overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%;
	}
	a.equipa:hover .nome, a.equipa:focus-visible .nome { text-decoration: underline; }
	.centro { display: flex; flex-direction: column; align-items: center; gap: var(--e-1); }
	.numeros {
		font-size: var(--t-placar); font-weight: 700; line-height: 1;
		font-variant-numeric: tabular-nums;
	}
	.tr { color: var(--heroi-suave); margin: 0 var(--e-1); font-weight: 400; }
	.estado {
		display: inline-flex; align-items: center; gap: var(--e-1);
		font-size: var(--t-pequeno); color: var(--heroi-suave);
		font-variant-numeric: tabular-nums;
	}
	.estado.vivo { color: var(--vivo); font-weight: 600; }
	.estado i {
		width: 6px; height: 6px; border-radius: 50%; background: var(--vivo);
		animation: pulsar 1.6s ease-in-out infinite;
	}
	@keyframes pulsar { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
	@media (prefers-reduced-motion: reduce) { .estado i { animation: none; } }

	/* os golos por ordem de jogo, com o resultado a andar */
	.golos { list-style: none; margin: var(--e-4) 0 0; padding: 0; }
	/* duas colunas: o texto encostado à direita e o resultado à esquerda, de modo a que a
	   lista fique centrada na fronteira entre os dois — é o alinhamento da referência */
	.golos li {
		display: grid; grid-template-columns: 1fr 3.2rem; gap: var(--e-3);
		align-items: baseline; padding: 2px 0;
		font-size: var(--t-pequeno);
	}
	.golos .texto {
		display: flex; align-items: baseline; justify-content: flex-end; gap: var(--e-2);
		min-width: 0;
	}
	.minuto { color: var(--heroi-suave); font-variant-numeric: tabular-nums; }
	.quem {
		color: var(--heroi-texto);
		overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
	}
	.conta {
		justify-self: start; color: var(--heroi-suave);
		font-variant-numeric: tabular-nums;
	}
	.conta b { font-weight: 400; }
	.conta b.marcou { font-weight: 700; color: var(--heroi-texto); }
	.conta i { font-style: normal; margin: 0 2px; }
	.golos .parte {
		display: block; text-align: center; color: var(--heroi-suave);
		font-size: var(--t-micro); letter-spacing: 0.06em; padding: var(--e-2) 0;
	}
	.golos .parte span::before,
	.golos .parte span::after { content: '—'; margin: 0 var(--e-2); opacity: 0.6; }
	.golos .mais { display: block; text-align: center; padding-top: var(--e-2); }
	.golos .mais button {
		background: none; border: 0; cursor: pointer; padding: var(--e-1) var(--e-3);
		color: var(--heroi-suave); font-size: var(--t-micro); text-decoration: underline;
	}

	/* a ligação para a competição, dentro do herói */
	.prova {
		display: flex; align-items: center; justify-content: space-between; gap: var(--e-3);
		margin: var(--e-4) calc(var(--e-4) * -1) calc(var(--e-4) * -1);
		padding: var(--e-3) var(--e-4);
		border-top: 1px solid var(--heroi-borda);
		text-decoration: none; color: var(--heroi-texto); text-align: left;
	}
	.prova .texto { display: flex; flex-direction: column; min-width: 0; }
	.prova .escalao {
		font-size: var(--t-micro); letter-spacing: 0.05em; color: var(--heroi-suave);
	}
	.prova .nome {
		font-size: var(--t-pequeno);
		overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
	}
	.prova .jornada {
		display: inline-flex; align-items: center; gap: var(--e-2);
		font-size: var(--t-pequeno); color: var(--heroi-suave); white-space: nowrap;
	}
	.prova:hover, .prova:focus-visible { background: rgb(255 255 255 / 0.06); outline: none; }

	.sentinela { height: 0; }

	/* ------------------------------------------------ a barra que nunca desaparece */
	.compacta {
		position: fixed; inset: var(--topo, 60px) 0 auto 0; z-index: 9;
		background: var(--heroi); color: var(--heroi-texto);
		border-bottom: 1px solid var(--heroi-borda);
		opacity: 0; transform: translateY(-6px); pointer-events: none;
		transition: opacity 0.16s ease, transform 0.16s ease;
	}
	.compacta.visivel { opacity: 1; transform: none; pointer-events: auto; }
	.interior {
		display: flex; align-items: center; justify-content: center; gap: var(--e-3);
		max-width: 44rem; margin: 0 auto; padding: var(--e-2) var(--e-4);
	}
	.compacta .res {
		font-size: var(--t-destaque); font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	/* ------------------------------------------------------------- separadores */
	/* Colados logo por baixo da barra do resultado, e não no topo do ecrã: só assim se
	   troca de separador sem ter de rolar para cima. A altura da barra é medida, não
	   adivinhada — se um dia lá couber mais coisa, os separadores acompanham. */
	.tabs {
		position: sticky;
		top: calc(var(--topo, 60px) + var(--barra, 35px));
		z-index: 8;
		display: flex; gap: var(--e-1);
		margin: 0 -0.9rem var(--e-5); padding: var(--e-2) 0.9rem;
		background: var(--fundo);
		overflow-x: auto; scrollbar-width: none;
	}
	.tabs::-webkit-scrollbar { display: none; }
	.tabs button {
		flex: 1 0 auto; min-height: 40px; padding: var(--e-2) var(--e-4);
		font-size: var(--t-pequeno); cursor: pointer; white-space: nowrap;
		border-radius: var(--raio-pilula); border: 1px solid var(--borda);
		background: var(--cartao); color: var(--texto-2);
	}
	.tabs button[aria-selected='true'] {
		background: var(--acento); border-color: var(--acento);
		color: var(--cartao); font-weight: 600;
	}

	.serie {
		font-size: var(--t-micro); letter-spacing: 0.05em; text-transform: uppercase;
		color: var(--suave); margin: var(--e-5) 0 var(--e-2);
	}
	.aviso {
		margin: 0 0 var(--e-4); padding: var(--e-3) var(--e-4);
		font-size: var(--t-pequeno); line-height: 1.45;
		border-radius: var(--raio); background: var(--aviso-fundo); color: var(--aviso);
	}
	.vazio { color: var(--suave); font-size: var(--t-base); }
</style>
