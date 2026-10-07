<script lang="ts">
	import Cronologia from '$lib/Cronologia.svelte';
	import RotuloCalculada from '$lib/RotuloCalculada.svelte';
	import { tabelasDe } from '$lib/classificacao';
	import Emblema from '$lib/Emblema.svelte';
	import FichaEquipas from '$lib/FichaEquipas.svelte';
	import TabelaClassificacao from '$lib/TabelaClassificacao.svelte';
	import Faixa from '$lib/Faixa.svelte';
	import InfoJogo from './InfoJogo.svelte';
	import Icone from '$lib/Icone.svelte';
	import { nomeProprio, nomeProva } from '$lib/formato';
	import { piscar } from '$lib/piscar';
	import { caminhoEquipa } from '$lib/slug';
	import type { EventoJogo } from '$lib/tipos';
	import { untrack } from 'svelte';

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
	/**
	 * A tabela desta prova, da fonte ou nossa.
	 *
	 * Até 07/10/2026 os Escolares e os Benjamins não tinham separador nenhum aqui, porque a
	 * fonte não publica tabela nesses escalões. Agora têm, com o rótulo de não oficial.
	 * Continua a não haver separador nas eliminatórias e nos jogos-treino, onde uma
	 * classificação não quer dizer nada — ver `vale_calcular` no raspador.
	 */
	const tabela = $derived(tabelasDe(data.competicao));
	const grupos = $derived(tabela.grupos);
	const temTabela = $derived(grupos.some((g) => g.linhas.length > 0));
	const temSeparadores = $derived(temEventos || temTabela || temEquipas || temInfo);

	type Tab = 'eventos' | 'tabela' | 'equipas' | 'info';
	let tab = $state<string>('eventos');
	/** os separadores que existem neste jogo, pela ordem em que aparecem na barra */
	const abas = $derived(
		(
			[
				['eventos', temEventos],
				['tabela', temTabela],
				['equipas', temEquipas],
				['info', temInfo]
			] as [Tab, boolean][]
		)
			.filter(([, ha]) => ha)
			.map(([id]) => id)
	);
	// num jogo a decorrer é a cronologia que se quer, não a ficha
	$effect(() => {
		if (aDecorrer) tab = 'eventos';
	});

	/**
	 * Os marcadores, numa coluna por equipa e por baixo dela.
	 *
	 * Já tinham estado ao centro, numa só lista por ordem de jogo com o resultado a andar.
	 * Lia-se bem a história do jogo, mas não se via de quem era cada golo sem ir ler os
	 * números — e num 21–7 isso é trabalho a mais. Por baixo de cada equipa não há dúvida
	 * nenhuma. A história completa continua no separador dos eventos.
	 */
	const marcadores = $derived.by(() => {
		const por = { casa: [] as string[], fora: [] as string[] };
		for (const e of f.cronologia as EventoJogo[]) {
			if (e.tipo !== 'golo') continue;
			const minuto = e.minuto !== null ? `${e.minuto}'` : '';
			const nome = e.jogador ? nomeProprio(e.jogador) : '';
			const rotulo = [minuto, nome].filter(Boolean).join(' ');
			if (!rotulo) continue;
			if (e.equipa === f.casa) por.casa.push(rotulo);
			else if (e.equipa === f.fora) por.fora.push(rotulo);
		}
		return por;
	});
	const temMarcadores = $derived(marcadores.casa.length + marcadores.fora.length > 0);

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
	 * O herói colapsa **a acompanhar o scroll**, e nunca desaparece.
	 *
	 * Era um salto: o cabeçalho ia-se embora e uma barra à parte aparecia por cima. Agora é
	 * o mesmo elemento, colado ao topo, a encolher entre 0 e 1 à medida que se rola — os
	 * nomes, os golos e a competição fecham-se, os emblemas e o resultado diminuem, e o que
	 * fica é a faixa com o essencial.
	 *
	 * O alcance é a altura real do que se fecha, medida: assim não há número de píxeis
	 * escrito à mão que deixe de servir num jogo com vinte golos.
	 */
	let k = $state(0);
	/** altura natural do que colapsa, medida num invólucro que não é constrangido */
	let alturaExtras = $state(0);
	let cromado = $state<HTMLElement | null>(null);
	let extras = $state<HTMLElement | null>(null);
	/**
	 * A altura do cromado, **somada** e não medida de uma vez só.
	 *
	 * Medir `.cromado` inteiro é uma corrida que se perde. A altura do que se fecha chega
	 * por um `bind:clientHeight`, e quando o observador acorda o `--alt` ainda não foi ao
	 * DOM: medido aqui, o estado já dizia 121 e o ecrã ainda dava 114. A reserva nascia
	 * 76px curta e o cromado ficava pousado por cima do princípio da lista — a 05/10, no
	 * SC TORRES–CD PAÇO ARCOS B, o único golo do jogo estava no separador dos eventos e
	 * **não se via**.
	 *
	 * Somadas, as duas parcelas medem-se cada uma onde é fiável: a base descontando os
	 * extras ao cromado, os extras no invólucro que não os constrange. A conta fecha logo
	 * no primeiro quadro, haja ou não notificação de tamanho pelo meio.
	 *
	 * O `ResizeObserver` fica para o que muda **depois**: os emblemas chegam da rede, o
	 * nome de uma prova parte numa linha a mais, o telemóvel roda, e numa ronda ao vivo
	 * entra um marcador novo — que é precisamente quando ninguém quer o cromado a tapar o
	 * que acabou de acontecer.
	 *
	 * A colapsada é apanhada à passagem; enquanto não foi vista, o alcance serve-se da
	 * altura do que se fecha, que lhe anda perto.
	 */
	let alturaBase = $state(0);
	let alturaColapsada = $state(0);
	$effect(() => {
		const el = cromado;
		const ex = extras;
		if (!el || !ex) return;
		// `untrack`: ler o `k` aqui dentro faria o efeito voltar a correr — e a trocar de
		// observador — a cada quadro de scroll. Quer-se um observador só, que leia o `k` do
		// momento em que mede.
		const medir = () =>
			untrack(() => {
				if (k === 0) alturaBase = el.offsetHeight - ex.offsetHeight;
				else if (k === 1) alturaColapsada = el.offsetHeight;
			});
		medir();
		const olho = new ResizeObserver(medir);
		olho.observe(el);
		return () => olho.disconnect();
	});
	/** o cromado aberto: o que fica mais o que se fecha */
	const alturaExpandida = $derived(alturaBase + alturaExtras);
	const alcance = $derived(
		Math.max(1, alturaExpandida && alturaColapsada
			? alturaExpandida - alturaColapsada
			: alturaExtras)
	);

	$effect(() => {
		const limite = alcance;
		// Directamente no `scroll` e **não** dentro de um `requestAnimationFrame`: o browser
		// estrangula o rAF quando o separador não está à vista, e aí o cabeçalho deixava de
		// colapsar. Ler o `scrollY` não força cálculo de layout, por isso não custa nada.
		const ao = () => (k = Math.min(1, Math.max(0, scrollY / limite)));
		ao();
		addEventListener('scroll', ao, { passive: true });
		return () => removeEventListener('scroll', ao);
	});

	const estado = $derived(
		aDecorrer ? (f.relogio ?? f.periodo ?? f.situacao ?? 'Ao vivo')
			: porComecar ? 'Por começar'
			: 'Final'
	);
</script>

<svelte:head><title>{f.casa} {f.golos_casa}–{f.golos_fora} {f.fora}</title></svelte:head>

<!--
  A reserva guarda no fluxo a altura do cromado **expandido**, e não muda.

  Sem ela havia um ciclo: o herói encolhia, o documento encurtava, o browser puxava o scroll
  para trás e o herói voltava a crescer. Media-se: pedir 300px de scroll dava 263, e o
  colapso ficava preso. Com a reserva, encolher não mexe no documento.
-->
<div class="reserva" style="height: {alturaExpandida || ''}px">
<div class="cromado" class:fixo={k === 1} bind:this={cromado}>
<article class="heroi" style="--k: {k}; --alt: {alturaExtras}px">
	<!-- leva ao dia **deste** jogo e não a hoje: quem abriu um jogo de quinta-feira quer
	     voltar a quinta-feira, e não ao dia em que calha estar -->
	<a class="voltar" href={f.data ? `/?dia=${f.data}` : '/'} aria-label="Voltar aos jogos">←</a>

	<!-- sempre visível: é isto que sobra quando tudo o resto se fecha -->
	<div class="placar">
		<span class="emb"><Emblema equipa={f.casa} src={data.emblemas[f.casa]} tamanho={44} /></span>
		<span class="centro">
			<span class="numeros" use:piscar={`${f.golos_casa}-${f.golos_fora}`}
				>{f.golos_casa}<span class="tr">–</span>{f.golos_fora}</span
			>
			<span class="estado" class:vivo={aDecorrer}>
				{#if aDecorrer}<i aria-hidden="true"></i>{/if}{estado}
			</span>
		</span>
		<span class="emb"><Emblema equipa={f.fora} src={data.emblemas[f.fora]} tamanho={44} /></span>
	</div>

	<div class="extras" bind:this={extras}>
		<div class="medida" bind:clientHeight={alturaExtras}>
			<div class="nomes">
				<svelte:element this={f.categoria ? 'a' : 'span'}
					href={f.categoria ? caminhoEquipa(f.casa, f.categoria) : null}>{f.casa}</svelte:element>
				<svelte:element this={f.categoria ? 'a' : 'span'}
					href={f.categoria ? caminhoEquipa(f.fora, f.categoria) : null}>{f.fora}</svelte:element>
			</div>

			{#if temMarcadores}
				<div class="marcadores">
					<ul>{#each marcadores.casa as m, i (i)}<li>{m}</li>{/each}</ul>
					<ul>{#each marcadores.fora as m, i (i)}<li>{m}</li>{/each}</ul>
				</div>
			{/if}

			<!-- W7.3: o caminho de volta à competição, dentro do herói -->
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
		</div>
	</div>
</article>

{#if temSeparadores}
	<!-- Ícones e não texto: cabem os quatro de ponta a ponta sem apertar, e o rótulo
	     continua a existir para quem lê por voz. Dentro do cromado, para ficarem sempre
	     agarrados ao herói e nunca passarem por baixo dele. -->
	<div class="tabs" role="tablist">
		{#if temEventos}
			<button role="tab" aria-selected={tab === 'eventos'} aria-label="Eventos do jogo"
				onclick={() => (tab = 'eventos')}><Icone nome="eventos" tamanho={22} /></button>
		{/if}
		{#if temTabela}
			<button role="tab" aria-selected={tab === 'tabela'} aria-label="Classificação"
				onclick={() => (tab = 'tabela')}><Icone nome="tabela" tamanho={22} /></button>
		{/if}
		{#if temEquipas}
			<!-- num jogo por começar isto é a convocatória, não a ficha -->
			<button role="tab" aria-selected={tab === 'equipas'}
				aria-label={porComecar ? 'Convocados' : 'Equipas'}
				onclick={() => (tab = 'equipas')}><Icone nome="equipas" tamanho={22} /></button>
		{/if}
		{#if temInfo}
			<button role="tab" aria-selected={tab === 'info'} aria-label="Informações"
				onclick={() => (tab = 'info')}><Icone nome="informacoes" tamanho={22} /></button>
		{/if}
	</div>
{/if}
</div>
</div>

{#if temSeparadores}
	<!-- A mesma faixa que troca de dia na lista de jogos: o separador segue o dedo em vez
	     de saltar quando ele se levanta. -->
	<Faixa itens={abas} bind:escolhido={tab}>
		{#snippet pagina(aba)}
			{#if aba === 'eventos'}
				<Cronologia eventos={f.cronologia} casa={f.casa} fora={f.fora}
					omitidos={f.individuais_omitidos ?? false} />
			{:else if aba === 'tabela'}
				{#each grupos as g (g.nome ?? '')}
					{#if g.linhas.length}
						{#if g.nome}<h2 class="serie">{g.nome}</h2>{/if}
						<TabelaClassificacao linhas={g.linhas} emblemas={data.emblemas}
							categoria={f.categoria ?? ''}
							destaque={(e) => e === f.casa || e === f.fora} />
					{/if}
				{/each}
				{#if tabela.calculada}<RotuloCalculada />{/if}
			{:else if aba === 'equipas'}
				{#if porComecar}
					<p class="aviso">
						Este jogo ainda não começou. Esta é a <strong>convocatória</strong> publicada
						pela associação, e pode mudar até ao apito inicial.
					</p>
				{/if}
				<FichaEquipas equipas={f.equipas} {porComecar} />
			{:else if aba === 'info'}
				<InfoJogo {f} {morada} {linkMapa} />
			{/if}
		{/snippet}
	</Faixa>
{:else}
	<p class="vazio">Este jogo não tem detalhe publicado.</p>
{/if}

<style>
	/* ---------------------------------------------------------------- o herói */
	/* a reserva guarda o espaço; o cromado é o que cola ao topo e encolhe */
	.reserva { margin: calc(var(--e-4) * -1) -0.9rem var(--e-4); }
	.cromado {
		position: sticky;
		top: var(--topo, 60px);
		z-index: 9;
	}
	/*
	  `sticky` só segura dentro da reserva, e a reserva acaba exactamente quando o colapso
	  acaba — a partir daí o cromado ia-se embora com ela. Ao chegar ao fim passa a `fixed`,
	  no mesmo sítio onde o `sticky` o tinha deixado, por isso a troca não se vê. E como a
	  reserva mantém a altura, o conteúdo encosta-lhe por baixo sem salto.
	*/
	.cromado.fixo {
		position: fixed;
		top: var(--topo, 60px);
		left: 50%;
		transform: translateX(-50%);
		width: min(100vw, calc(44rem + 1.8rem));
	}
	.heroi {
		padding: calc(var(--e-4) - var(--k) * 6px) var(--e-4) calc(var(--e-3) - var(--k) * 2px);
		background: var(--heroi);
		color: var(--heroi-texto);
		border-bottom: 1px solid var(--heroi-borda);
		text-align: center;
	}
	/* Absoluta: num bloco centrado, `margin-right: auto` não encosta nada à esquerda.
	   Fica visível também no estado colapsado — se desaparecesse, de lá não havia como
	   voltar atrás sem sair da página. */
	.voltar {
		position: absolute; left: var(--e-1); top: calc(var(--e-1) - var(--k) * 2px);
		display: inline-flex; align-items: center; justify-content: center;
		width: 44px; height: 44px;
		font-size: var(--t-destaque); text-decoration: none;
		color: var(--heroi-texto);
	}

	/* o espaço entre os emblemas fecha-se com o colapso, para o resultado ficar compacto */
	.placar {
		display: flex; align-items: center; justify-content: center;
		gap: calc(var(--e-4) + (1 - var(--k)) * 2.2rem);
	}
	/* a Emblema fixa width/height em linha; aqui a medida tem de variar com o colapso */
	.emb { display: inline-flex; flex: 0 0 auto;
		width: calc(44px - var(--k) * 20px); height: calc(44px - var(--k) * 20px); }
	.emb :global(img), .emb :global(.iniciais) { width: 100% !important; height: 100% !important; }

	.centro { display: flex; flex-direction: column; align-items: center; gap: 1px; }
	.numeros {
		padding: 0 var(--e-2); margin: 0 calc(var(--e-2) * -1);
		font-size: calc(var(--t-placar) - var(--k) * 0.75rem);
		font-weight: 700; line-height: 1.1;
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

	/* o que se fecha: nomes, golos e competição. `--k` vai de 0 a 1 com o scroll. */
	.extras {
		max-height: calc((1 - var(--k)) * var(--alt, 0px));
		opacity: calc(1 - var(--k) * 1.8);
		overflow: hidden;
	}
	/* invólucro não constrangido: é dele que se mede a altura natural */
	.medida { padding-top: var(--e-3); }

	.nomes {
		display: grid; grid-template-columns: 1fr 1fr; gap: var(--e-3);
		font-size: var(--t-base);
	}
	.nomes > :global(*) {
		overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
		text-decoration: none; color: inherit;
	}
	.nomes > :global(a:hover), .nomes > :global(a:focus-visible) { text-decoration: underline; }

	/* uma coluna por equipa, debaixo dela: assim não é preciso ler números para saber
	   de quem é cada golo */
	.marcadores {
		display: grid; grid-template-columns: 1fr 1fr; gap: var(--e-3);
		margin-top: var(--e-3);
	}
	.marcadores ul {
		list-style: none; margin: 0; padding: 0;
		font-size: var(--t-pequeno); color: var(--heroi-suave);
		display: flex; flex-direction: column; gap: 2px;
	}
	.marcadores li {
		overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
	}

	/* a ligação para a competição, dentro do herói */
	.prova {
		display: flex; align-items: center; justify-content: space-between; gap: var(--e-3);
		margin: var(--e-3) calc(var(--e-4) * -1) 0;
		padding: var(--e-3) var(--e-4) 0;
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

	/* ------------------------------------------------------------- separadores */
	/* Colados por baixo do herói, que muda de altura ao colapsar — daí a altura vir
	   medida e não escrita à mão. Nunca ficam escondidos. */
	.tabs {
		display: flex;
		background: var(--cartao);
		border-bottom: 1px solid var(--borda);
	}
	.tabs button {
		flex: 1 1 0; min-height: 46px; padding: var(--e-2) 0;
		display: flex; align-items: center; justify-content: center;
		cursor: pointer; background: none; border: 0;
		border-bottom: 2px solid transparent;
		color: var(--suave);
	}
	.tabs button[aria-selected='true'] {
		color: var(--acento);
		border-bottom-color: var(--acento);
	}
	.tabs button[aria-selected='true'] :global(svg) { color: var(--acento); }

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
