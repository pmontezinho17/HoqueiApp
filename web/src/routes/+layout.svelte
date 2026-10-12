<script lang="ts">
	import AutoRefrescar from '$lib/AutoRefrescar.svelte';
	import AvisoVersao from '$lib/AvisoVersao.svelte';
	import SaidaDoRamo from '$lib/SaidaDoRamo.svelte';
	import { ehSiteDeRamo } from '$lib/ambiente.js';
	import Holofote from '$lib/Holofote.svelte';
	// temporário, para a fase de testes — ver web/src/lib/feedback.ts
	import Feedback from '$lib/Feedback.svelte';
	import { RECOLHER_FEEDBACK } from '$lib/feedback';
	import { pwaInfo } from 'virtual:pwa-info';

	// sem isto não há <link rel="manifest"> no HTML: o manifest existia e ninguém lhe apontava,
	// e o browser não tinha como saber que a app é instalável
	const manifest = $derived(pwaInfo?.webManifest?.linkTag ?? '');

	import { page, navigating } from '$app/state';
	import Desatualizado from '$lib/Desatualizado.svelte';
	import Icone from '$lib/Icone.svelte';
	import { favoritos } from '$lib/favoritos.svelte';
	import MenuMais from '$lib/MenuMais.svelte';
	import CaixaNovidades from '$lib/CaixaNovidades.svelte';
	import { tema } from '$lib/tema.svelte';
	import { cor } from '$lib/cor.svelte';
	import { APP_NOME } from '$lib/sitio';
	import { marcarPresenca } from '$lib/presenca';

	let { data, children } = $props();

	/**
	 * Estamos num site de ramo? Só se sabe no browser — o `adapter-static` pré-constrói estas
	 * páginas e, na altura em que o faz, não há anfitrião nenhum.
	 *
	 * Enquanto não se souber, assume-se que **não**: um `true` por omissão punha a folha de
	 * aviso a piscar em produção a cada arranque, que é um defeito pior do que o que isto
	 * resolve.
	 */
	let noRamo = $state(false);
	$effect(() => {
		noRamo = ehSiteDeRamo(location.hostname);
	});

	let menuAberto = $state(false);

	/**
	 * A marca parte-se no primeiro ponto: `OK4Sticks` a cheio e `.DEV` em voz baixa.
	 *
	 * Calculado e não escrito à mão, porque o nome muda com o ambiente — a principal é
	 * `OK4Sticks` e o site de testes é `OK4Sticks.DEV`, e o cabeçalho tem de dizer em qual
	 * dos dois a pessoa está.
	 */
	const marca = APP_NOME.split('.');
	const marcaBase = marca[0];
	const marcaSufixo = marca.length > 1 ? `.${marca.slice(1).join('.')}` : '';

	// Três destinos primários, sempre visíveis. O secundário vive nos ícones do cabeçalho —
	// medido: esconder navegação primária num menu corta a descoberta a metade
	// (ver docs/04-benchmarking.md).
	//
	// **Em baixo**, e não em cima: num telemóvel grande o topo do ecrã não se alcança com o
	// polegar da mão que segura o aparelho. É onde a theScore, a Sofascore e a FotMob a
	// põem, e o cabeçalho fica só com a marca e os dois ícones.
	const SECCOES = [
		{ href: '/', rotulo: 'Jogos', icone: 'jogos' },
		{ href: '/clube', rotulo: 'O Meu Clube', icone: 'clube' },
		{ href: '/competicoes', rotulo: 'Competições', icone: 'prova' }
	];
	const activa = (href: string) =>
		href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);

	/** altura real do cabeçalho colado, publicada em `--topo` para quem precise de colar
	 *  algo imediatamente abaixo dele */
	let alturaTopo = $state(96);

	// os favoritos vivem no localStorage e só existem no browser; sem isto a app abria
	// sempre como se não se seguisse ninguém (perdido na reestruturação dos separadores)
	$effect(() => favoritos.carregar());
	// a cor escolhida vive no aparelho e só existe no browser, como o tema
	$effect(() => cor.carregar());

	// a preferência de tema também só existe no browser, e aplica-se ao `<html>`
	$effect(() => tema.carregar());

	// Uma vez por dia e por aparelho, sem identificador nenhum — ver `lib/presenca.ts`.
	// É o que responde a "quantos aparelhos distintos abriram a app", que o contador de
	// pedidos não sabe responder: uma app aberta numa bancada pede dados de 30 em 30
	// segundos e parecem sessenta pessoas.
	$effect(() => marcarPresenca());
</script>

{#if navigating.to}<div class="progresso" role="status" aria-label="A carregar"></div>{/if}

<svelte:head>{@html manifest}</svelte:head>

<a class="salto" href="#conteudo">Saltar para o conteúdo</a>

<header bind:clientHeight={alturaTopo}>
	<div class="topo">
		<!-- O descritor do desporto saiu do cabeçalho porque o nome novo é mais largo e aqui
		     cabem só a marca, a frescura dos dados e dois ícones — ele continua no manifesto e
		     na página "Sobre a app e os dados". -->
		<a class="marca" href="/">{marcaBase}{#if marcaSufixo}<span>{marcaSufixo}</span>{/if}</a>
		<div class="acoes">
			<Desatualizado geradoEm={data.meta.generated_at} />
			<a class="icone" href="/procurar" aria-label="Procurar equipa" data-guia="procurar">
				<svg viewBox="0 0 20 20" width="19" height="19" aria-hidden="true">
					<circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" stroke-width="1.8" />
					<path d="M12.8 12.8 17 17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
				</svg>
			</a>
			<!-- deixou de ser um link para `/mais`: abre o menu, e `/mais` é uma das linhas lá
			     dentro — ver lib/MenuMais.svelte -->
			<button
				class="icone"
				aria-label="Mais opções"
				aria-haspopup="dialog"
				aria-expanded={menuAberto}
				onclick={() => (menuAberto = !menuAberto)}
			>
				<svg viewBox="0 0 20 20" width="19" height="19" aria-hidden="true">
					<circle cx="10" cy="4" r="1.7" fill="currentColor" />
					<circle cx="10" cy="10" r="1.7" fill="currentColor" />
					<circle cx="10" cy="16" r="1.7" fill="currentColor" />
				</svg>
			</button>
		</div>
	</div>
</header>

<!-- `--topo` é a altura real deste cabeçalho, medida e não adivinhada: as páginas que
     precisam de colar algo abaixo dele (a barra compacta do jogo) leem-na daqui, e
     acompanham-no quando a navegação parte em duas linhas num ecrã estreito. -->
<!-- `comBolha`: a bolha de opinião flutua no canto inferior direito e tapa o que esteja no
     fim da página. Apareceu a 07/10/2026 com a nota de "classificação não oficial", cujo link
     ficou por baixo dela e deixou de se poder tocar. Enquanto a bolha existir, o conteúdo
     reserva-lhe a altura. -->
<main id="conteudo" class:comBolha={RECOLHER_FEEDBACK} style="--topo: {alturaTopo}px">
	{@render children()}
</main>

<!--
  A atribuição saiu do rodapé para a página do ⋮, que já a tinha por extenso em "Dados" e
  "Este site não é oficial". O que dissemos à APL foi que a aplicação "identifica a APL como
  fonte" — o "em todas as páginas" era regra nossa, não promessa. Fica em dois cliques em vez
  de um, e em troca o rodapé deixa de empurrar a barra de navegação.
-->
<nav class="barra" aria-label="Secções">
	{#each SECCOES as s (s.href)}
		<a
			href={s.href}
			aria-current={activa(s.href) ? 'page' : undefined}
			data-guia={s.href === '/' ? undefined : `nav-${s.href.slice(1)}`}
		>
			<Icone nome={s.icone} tamanho={21} />
			<span>{s.rotulo}{#if s.href === '/clube' && favoritos.lista.length}<i class="conta">{favoritos.lista.length}</i>{/if}</span>
		</a>
	{/each}
</nav>

<!-- fora do `<header>` de propósito: lá dentro o véu ficava preso ao contexto de
     empilhamento do cabeçalho e não cobria a barra de navegação de baixo -->
<MenuMais bind:aberto={menuAberto} topo={alturaTopo} />

<AutoRefrescar agenda={data.agenda} />
<!-- Num site de ramo o service worker **não se regista**, e é o `AvisoVersao` que o faz.
     Sem isto, cada ramo publicado continuava a poder ser instalado como app e a render mais
     uma cópia parada no telemóvel de alguém. -->
{#if noRamo}
	<SaidaDoRamo />
{:else}
	<AvisoVersao />
{/if}
<Holofote />

<!-- a nota do que mudou, depois de uma actualização — ver lib/novidades.svelte.ts -->
<CaixaNovidades />
{#if RECOLHER_FEEDBACK}<Feedback />{/if}

<style>
	/*
	 * Os tokens. Contei antes de os escrever: a app tinha **30 tamanhos de letra**
	 * distintos — vinte deles entre 0,54rem e 0,86rem — e **25 espaçamentos**. Ninguém vê a
	 * diferença entre 0,74 e 0,76rem; o que se vê é que nada alinha com nada, e é isso que
	 * o olho lê como amador. Daqui para a frente escolhe-se desta lista, não se inventa um
	 * número de cada vez.
	 */
	:global(:root) {
		/* escala de texto: 6 degraus, e nenhum entre eles */
		--t-micro: 0.6875rem;     /* 11px — escalão, série, legendas */
		--t-pequeno: 0.75rem;     /* 12px — horas, texto secundário */
		--t-base: 0.8125rem;      /* 13px — nomes de equipa, corpo */
		--t-destaque: 0.9375rem;  /* 15px — resultado na lista, títulos de secção */
		--t-titulo: 1.125rem;     /* 18px */
		--t-placar: 1.75rem;      /* 28px — o resultado no ecrã do jogo */

		/* espaçamento: base de 4px, com um 6px porque numa lista densa 4 é pouco e 8 é
		   demasiado — e sem esse degrau voltaríamos a inventar números */
		--e-0: 2px; --e-1: 4px; --e-2: 6px; --e-3: 8px;
		--e-4: 12px; --e-5: 16px; --e-6: 24px; --e-7: 32px;

		--raio: 8px; --raio-cartao: 12px; --raio-pilula: 999px;

		/* Três níveis de texto e dois de separador, onde antes havia dois e um. É o que
		   permite o cabeçalho de uma secção recuar atrás do conteúdo em vez de competir
		   com ele. */
		--fundo: #f5f6f8; --cartao: #fff;
		--texto: #14171c; --texto-2: #4b525c; --suave: #767e8a;
		--borda: #e3e6ea; --borda-fraca: #eef0f3;
		/* **O acento é escolhível, e os outros tokens não.** O `--c-claro` é escrito no
		   `<html>` pelo `cor.svelte.ts` quando alguém escolhe uma cor; sem escolha, o
		   fallback é o verde de sempre e nada muda. Os dois temas têm variáveis próprias
		   porque o claro precisa de uma cor escura para ler sobre branco e o escuro precisa
		   do contrário — ver o cabeçalho do `cor.svelte.ts`. */
		--acento: var(--c-claro, #0a7d54); --acento-fraco: var(--cf-claro, #e8f4ef);
		--aviso: #92400e; --aviso-fundo: #fef3c7; --vivo: #c2410c;
		/* **Um vermelho próprio para "terminada", e não o `--vivo`.** O `--vivo` quer dizer
		   "está a acontecer agora" e usá-lo para "já acabou" punha a mesma cor a dizer duas
		   coisas opostas na mesma aplicação. Este é mais frio e mais escuro, e nunca aparece
		   no mesmo ecrã que o outro. */
		--terminado: #b3261e;
		/* **O vermelho da transmissão, e não o `--vivo` nem o `--terminado`.**
		   O `--vivo` é laranja e quer dizer "está a acontecer"; numa janela com sete jogos a
		   decorrer está em todos, e uma câmara dessa cor desaparecia no meio deles — foi
		   exactamente a queixa do dono a 10/10/2026. O `--terminado` é vermelho mas já quer
		   dizer "acabou". Isto quer dizer uma terceira coisa — "este dá para ver" — e por
		   isso tem cor própria: o vermelho de gravação, que é a convenção que todos
		   reconhecem sem legenda. */
		--directo: #dc2626;
		/* a estrela do favorito: amarela nos dois temas, mais funda no claro para não
		   desaparecer contra o branco do cartão */
		--estrela: #d99e00;
		/* O herói do ecrã de jogo.
		 * Era quase preto, e os emblemas de contorno escuro — que são muitos: Lourinhã,
		 * Stuart, Sintra — desapareciam lá dentro. Passa a seguir o tema: claro no claro,
		 * escuro no escuro, sempre um degrau afastado do fundo da página para continuar a
		 * ler-se como uma área à parte. */
		--heroi: #eceff3; --heroi-texto: #14171c; --heroi-suave: #5f6872;
		--heroi-borda: #dadee4;
	}
	/*
	 * O escuro tem **dois caminhos**, e é por isso que a lista de cores aparece duas vezes.
	 *
	 * O primeiro é o do sistema, e é o que sempre houve. O segundo é a escolha à mão (P11.4),
	 * que tem de poder contrariá-lo nos dois sentidos: daí o `:not([data-tema='claro'])` no
	 * primeiro — senão quem escolhe claro num telemóvel escuro não consegue sair do escuro.
	 *
	 * Sim, a `light-dark()` do CSS resolvia isto com a lista escrita uma vez. Não se usa:
	 * precisa de iOS 17.5, e num iPhone mais antigo cada *token* ficaria sem valor nenhum —
	 * a app abria sem cores. Vinte linhas repetidas valem menos do que esse risco.
	 */
	@media (prefers-color-scheme: dark) {
		:global(:root:not([data-tema='claro'])) {
			--fundo: #0f1115; --cartao: #181b21;
			--texto: #e8eaed; --texto-2: #b6bcc5; --suave: #868d98;
			--borda: #272b33; --borda-fraca: #1f232a;
			--acento: var(--c-escuro, #34d399); --acento-fraco: var(--cf-escuro, #12271f);
			--aviso: #fcd34d; --aviso-fundo: #3a2e0b; --vivo: #fb923c;
			--terminado: #f2b8b5;
			--directo: #f87171;
			--estrela: #fbbf24;
			--heroi: #1b2027; --heroi-texto: #eef1f4; --heroi-suave: #949ca6;
			--heroi-borda: #2a313a;
		}
	}
	:global(:root[data-tema='escuro']) {
			--fundo: #0f1115; --cartao: #181b21;
			--texto: #e8eaed; --texto-2: #b6bcc5; --suave: #868d98;
			--borda: #272b33; --borda-fraca: #1f232a;
			--acento: var(--c-escuro, #34d399); --acento-fraco: var(--cf-escuro, #12271f);
			--aviso: #fcd34d; --aviso-fundo: #3a2e0b; --vivo: #fb923c;
			--terminado: #f2b8b5;
			--directo: #f87171;
			--estrela: #fbbf24;
			--heroi: #1b2027; --heroi-texto: #eef1f4; --heroi-suave: #949ca6;
			--heroi-borda: #2a313a;
	}
	/* os controlos nativos — barras de deslocamento, campos, selectores — seguem o tema;
	   quando a escolha é à mão, o `tema.svelte.ts` escreve `color-scheme` no próprio <html> */
	:global(:root) { color-scheme: light dark; }
	:global(*) { box-sizing: border-box; }
	:global(body) {
		margin: 0; background: var(--fundo); color: var(--texto);
		font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
		-webkit-text-size-adjust: 100%;
	}
	:global(a) { color: inherit; }

	/* Campos de formulário a 16px, não menos.
	 *
	 * O Safari do iPhone **amplia a página inteira** quando se foca um campo cuja letra
	 * tem menos de 16px, para a tornar legível. O efeito é a app aparecer cortada à
	 * direita — foi isso que o primeiro screenshot de iPhone mostrou, e eu tinha-o lido
	 * como overflow. Não era: o conteúdo cabia, a página é que estava ampliada.
	 *
	 * A correcção é o tamanho da letra e **não** `maximum-scale=1` nem `user-scalable=no`:
	 * essas tiram o pinch-zoom a quem precisa dele para ler. */
	:global(input), :global(select), :global(textarea) { font-size: max(16px, 1em); }

	/* só para leitores de ecrã: um h1 em páginas onde um título visível acrescentaria
	   cromado que o benchmarking mandou cortar */
	:global(.sr) {
		position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0;
		overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap;
	}
	/* o link de salto só aparece a quem navega por teclado */
	.salto {
		position: absolute; left: 0.5rem; top: -3rem; z-index: 60;
		padding: 0.6rem 0.9rem; font-size: 0.8rem; border-radius: 8px;
		background: var(--cartao); color: var(--texto); border: 1px solid var(--acento);
		transition: top 0.15s;
	}
	.salto:focus { top: 0.5rem; }

	/* acessibilidade (Q6.6) — o anel de foco é a única pista de onde se está a navegar
	   por teclado, e o `outline: none` que havia nos ícones tirava-a sem pôr nada no lugar */
	:global(:focus-visible) { outline: 2px solid var(--acento); outline-offset: 2px;
		border-radius: 4px; }
	:global(a:focus-visible), :global(button:focus-visible) { outline-offset: 3px; }

	/* O brilho de quem acabou de mudar — ver lib/piscar.ts. Global porque é uma acção que
	   se aplica a elementos de vários componentes. */
	:global(.piscou) {
		animation: brilho 1.6s ease-out;
		border-radius: var(--raio);
	}
	@keyframes brilho {
		0% { background: var(--acento); color: var(--cartao); }
		18% { background: var(--acento); color: var(--cartao); }
		100% { background: transparent; }
	}

	/* respeitar quem pede menos movimento */
	@media (prefers-reduced-motion: reduce) {
		:global(*) { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
	}

	/* cromado compacto: 178px antes do 1º jogo era 22% do ecrã (ver benchmarking) */
	header {
		position: sticky; top: 0; z-index: 10; background: var(--fundo);
		border-bottom: 1px solid var(--borda);
		max-width: 44rem; margin: 0 auto; padding: var(--e-2) 0.9rem;
	}
	.topo { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
	.marca { font-weight: 700; font-size: 0.98rem; text-decoration: none; }
	/* sem `margin-left`: ".DEV" cola-se ao nome, porque faz parte dele */
	.marca span { font-weight: 400; color: var(--suave); font-size: 0.72rem; }
	.acoes { display: flex; align-items: center; gap: 0.15rem; }
	.icone { display: inline-flex; align-items: center; justify-content: center;
		width: 44px; height: 44px; color: var(--suave); text-decoration: none;
		/* o ⋮ é um <button> e a lupa um <a>: sem isto um deles vinha com moldura e fundo */
		border: 0; background: none; padding: 0; font: inherit; cursor: pointer; }
	.icone:hover, .icone:focus-visible { color: var(--acento); }

	/* Barra de navegação em baixo, fixa.
	 *
	 * `env(safe-area-inset-bottom)` não é enfeite: no iPhone a barra ficava por baixo da
	 * risca de gestos e o terceiro separador era impossível de tocar. */
	.barra {
		position: fixed; inset: auto 0 0 0; z-index: 10;
		background: var(--fundo); border-top: 1px solid var(--borda);
		padding-bottom: env(safe-area-inset-bottom);
		display: flex; justify-content: center;
	}
	.barra a {
		flex: 1 1 0; max-width: 10rem;
		display: flex; flex-direction: column; align-items: center; justify-content: center;
		gap: 2px; min-height: 52px; padding: var(--e-2) var(--e-1);
		font-size: var(--t-micro); text-decoration: none; color: var(--suave);
		white-space: nowrap;
	}
	.barra a[aria-current='page'] { color: var(--acento); font-weight: 600; }
	.barra a[aria-current='page'] :global(svg) { color: var(--acento); }
	.conta {
		margin-left: var(--e-1); padding: 0 var(--e-2); border-radius: var(--raio-pilula);
		background: var(--acento); color: var(--cartao); font-size: var(--t-micro);
		font-style: normal;
	}

	/* o `padding-bottom` tem de limpar a barra fixa, senão o último jogo fica debaixo dela */
	main {
		max-width: 44rem; margin: 0 auto;
		padding: var(--e-4) 0.9rem calc(52px + env(safe-area-inset-bottom) + var(--e-6));
	}

	/* a altura da bolha (48px) mais o ar à volta dela */
	main.comBolha { padding-bottom: calc(52px + env(safe-area-inset-bottom) + var(--e-6) + 60px); }

	.progresso {
		position: fixed; inset: 0 0 auto 0; height: 3px; background: var(--acento);
		animation: correr 1s ease-in-out infinite; transform-origin: left; z-index: 20;
	}
	@keyframes correr { 0% { transform: scaleX(0); } 50% { transform: scaleX(0.7); } 100% { transform: scaleX(1); } }
	@media (prefers-reduced-motion: reduce) { .progresso { animation: none; } }
</style>
