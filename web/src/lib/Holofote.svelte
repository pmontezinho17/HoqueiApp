<script lang="ts">
	/**
	 * O holofote e o cartão do tour.
	 *
	 * O recorte não é uma máscara nem um `clip-path`: é **um** elemento com a posição do
	 * alvo e uma sombra de 9999px a escurecer tudo o que está em volta. Uma linha de CSS em
	 * vez de quatro rectângulos a tapar os lados, e sem o `clip-path` dar problemas em
	 * browsers antigos — e numa app que vive em telemóveis de bancada isso importa.
	 *
	 * A sombra não apanha cliques, por isso quem os apanha é o véu transparente por baixo.
	 * É de propósito que ele intercepta tudo: durante o tour, tocar no elemento iluminado
	 * não navega para lado nenhum. O tour explica, não conduz — e quem toca sem querer não
	 * se perde a meio.
	 */
	import { PASSOS, caminhoDe, enderecoDe, estaNoEcra, guia, primeiroComAlvo } from './guia.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	/** respiro em volta do alvo, para o holofote não lhe encostar ao bordo */
	const FOLGA = 6;
	/** distância do cartão ao holofote */
	const AR = 12;

	let caixa = $state<{ x: number; y: number; w: number; h: number } | null>(null);
	let alturaCartao = $state(180);

	/**
	 * O elemento que responde ao nome do passo — e que está **mesmo** no ecrã.
	 *
	 * Não basta um `querySelector`: a faixa que se arrasta monta o dia anterior e o seguinte
	 * ao lado do que se vê, por isso há três páginas de jogos no documento e três elementos
	 * com `data-guia="jogos"`. O primeiro em ordem de documento é o do dia **anterior**, que
	 * vive fora do ecrã à esquerda — e era para lá que o holofote apontava.
	 *
	 * Dois crivos, e os dois valem por si: as páginas vizinhas estão marcadas `inert`, e
	 * estão fora da largura do ecrã.
	 */
	const elementoDe = (nome: string | undefined): HTMLElement | null => {
		if (!nome || typeof document === 'undefined') return null;
		const todos = [...document.querySelectorAll<HTMLElement>(`[data-guia="${nome}"]`)];
		return (
			todos.find((el) => {
				if (el.closest('[inert]')) return false;
				const r = el.getBoundingClientRect();
				return r.width > 0 && r.height > 0 && r.right > 0 && r.left < innerWidth;
			}) ?? null
		);
	};
	const alvoDe = (i: number) => elementoDe(PASSOS[i]?.alvo);

	/**
	 * A regra do salto, agora com ecrãs.
	 *
	 * Um passo que viva noutro ecrã **não** se pode avaliar sem lá estar: o alvo só existe
	 * depois de navegar. Por isso conta como presente, e é depois de chegar lá que se
	 * decide. Um passo cujo caminho resolve a `null` — a página de uma equipa quando a
	 * pessoa não segue nenhuma — é que desaparece de vez.
	 */
	const proximoComAlvo = (i: number) =>
		primeiroComAlvo(i, (passo) => {
			if (caminhoDe(passo) === null) return false;
			if (!estaNoEcra(passo, page.url.pathname, page.url.searchParams)) return true;
			return !!elementoDe(passo.alvo);
		});

	/** Onde a pessoa estava quando o tour começou, para lá voltar no fim. */
	let regresso = $state<string | null>(null);

	function medir(el: HTMLElement) {
		const r = el.getBoundingClientRect();
		caixa = {
			x: r.left - FOLGA,
			y: r.top - FOLGA,
			w: r.width + FOLGA * 2,
			h: r.height + FOLGA * 2
		};
	}

	/** Salta para o próximo passo aplicável a partir de `desde`, ou acaba o tour. */
	function saltar(desde: number) {
		const k = proximoComAlvo(desde);
		if (k === null) terminar();
		else guia.irPara(k);
	}

	/**
	 * Efeito 1 — **navegar**. Só isso.
	 *
	 * Esteve junto com a medição num efeito só, e isso tornou o tour imprevisível: o mesmo
	 * percurso dava resultados diferentes de execução para execução. Um efeito que navega,
	 * mede, arma temporizadores e sai a meio por três caminhos distintos tem demasiadas
	 * ordens possíveis. Separado, cada um faz uma coisa e lê-se de uma vez.
	 */
	$effect(() => {
		if (!guia.activo) return;
		const passo = PASSOS[guia.indice];
		if (!passo) return;
		if (regresso === null) regresso = page.url.pathname;

		// caminho nulo: este passo não se aplica a esta pessoa — a página de uma equipa
		// quando ela não segue nenhuma
		const endereco = enderecoDe(passo);
		if (endereco === null) return saltar(guia.indice + 1);
		if (!estaNoEcra(passo, page.url.pathname, page.url.searchParams)) goto(endereco);
	});

	/**
	 * Efeito 2 — **medir**, e só depois de já estarmos no ecrã do passo.
	 *
	 * O passo é fixado em `i` à entrada e usado em todos os fechos, incluindo o ouvinte de
	 * scroll. A versão anterior lia `guia.indice` no momento em que o ouvinte disparava, e
	 * durante uma navegação isso media o alvo de um passo contra o DOM de outro ecrã.
	 */
	$effect(() => {
		if (!guia.activo) {
			caixa = null;
			// **Voltar ao ecrã de partida, saia o tour por onde sair.** Estava só no botão de
			// fechar, e havia caminhos que não passavam por lá — a desistência por falta de
			// alvo, por exemplo. Aqui cobre todos, porque a única coisa que todos têm em
			// comum é o tour deixar de estar activo.
			if (regresso !== null) {
				const volta = regresso;
				regresso = null;
				if (volta !== page.url.pathname) goto(volta);
			}
			return;
		}
		const i = guia.indice;
		if (
			caminhoDe(PASSOS[i]) === null ||
			!estaNoEcra(PASSOS[i], page.url.pathname, page.url.searchParams)
		) {
			caixa = null;
			return;
		}

		let paciencia: ReturnType<typeof setTimeout> | undefined;
		let tentativa: ReturnType<typeof setInterval> | undefined;

		/**
		 * Procura **só** o alvo deste passo.
		 *
		 * A primeira versão procurava aqui o próximo passo aplicável, e com isso a
		 * paciência nunca era usada: faltando o alvo deste ecrã, encontrava logo um passo
		 * de outro — que conta como aplicável enquanto não se chega lá — e saltava num
		 * instante. Medido: os dois passos de "O Meu Clube" eram sempre saltados, porque
		 * essa página mostra "A reunir os jogos…" enquanto espera pelas fichas.
		 */
		const medirAlvo = () => {
			const el = alvoDe(i);
			if (!el) return false;
			const r = el.getBoundingClientRect();
			// um alvo fora do ecrã traz-se para o meio antes de o iluminar
			if (r.top < 0 || r.bottom > innerHeight) el.scrollIntoView({ block: 'center' });
			medir(el);
			return true;
		};

		if (!medirAlvo()) {
			// **Apagar o recorte enquanto se espera.** Sem isto o cartão do passo novo
			// aparecia com o holofote no sítio do passo anterior — e num ecrã que já mudou,
			// isso é um rectângulo aceso sobre nada.
			caixa = null;
			tentativa = setInterval(() => {
				if (medirAlvo()) {
					clearInterval(tentativa);
					clearTimeout(paciencia);
				}
			}, 80);
			// Quatro segundos: a página do dia nasce dentro da faixa e isso é um tique, mas
			// "O Meu Clube" espera pelas fichas e isso é bem mais. Uma página que não rende
			// o alvo em quatro segundos não o tem.
			paciencia = setTimeout(() => {
				clearInterval(tentativa);
				saltar(i + 1);
			}, 4000);
		}

		// O ecrã mexe-se: roda-se o telemóvel, abre-se o teclado, rola-se a página.
		const outraVez = () => {
			const el = alvoDe(i);
			if (el) medir(el);
		};
		addEventListener('resize', outraVez);
		addEventListener('scroll', outraVez, { passive: true, capture: true });
		return () => {
			clearInterval(tentativa);
			clearTimeout(paciencia);
			removeEventListener('resize', outraVez);
			removeEventListener('scroll', outraVez, { capture: true });
		};
	});

	/** Abaixo do holofote se couber, acima se não. */
	const posicaoCartao = $derived.by(() => {
		if (!caixa) return null;
		const alt = alturaCartao;
		const abaixo = caixa.y + caixa.h + AR;
		if (abaixo + alt + AR <= innerHeight) return { top: abaixo };
		const acima = caixa.y - AR - alt;
		if (acima >= AR) return { top: acima };
		// não cabe em nenhum dos lados: encosta-se em baixo, que é onde o polegar está
		return { top: Math.max(AR, innerHeight - alt - AR) };
	});

	/**
	 * Quais os passos que se aplicam a esta pessoa. Serve só para saber qual é o último.
	 *
	 * **Não há contador de "n de N", e é deliberado.** Com os passos espalhados por três
	 * ecrãs, uns opcionais — a secção ao vivo só existe com um jogo a contar — e outros
	 * dependentes de quem a pessoa segue, o total é indecidível antes de percorrer o tour.
	 * A primeira versão contava os alvos presentes no ecrã e mentia das duas maneiras:
	 * dizia "2 de 2" no último passo de um tour de cinco, e o número voltava a crescer ao
	 * navegar. Um contador errado é pior do que nenhum, e o rótulo "Terminar" já diz o que
	 * faltava saber.
	 */
	const aplicaveis = $derived.by(() => {
		void guia.indice;
		void page.url.pathname;
		return PASSOS.map((_, i) => i).filter((i) => {
			const c = caminhoDe(PASSOS[i]);
			if (c === null) return false;
			if (c !== page.url.pathname) return true;
			return !!elementoDe(PASSOS[i].alvo);
		});
	});
	/**
	 * Fechar o tour e devolver a pessoa ao ecrã onde o abriu.
	 *
	 * Sem isto o tour deixava-a na página de uma equipa que ela não pediu, só porque foi o
	 * último passo a ser mostrado.
	 */
	function terminar() {
		guia.sair(); // o regresso ao ecrã de partida é tratado no efeito da medição
	}

	const ultimo = $derived(
		aplicaveis.length === 0 || guia.indice >= aplicaveis[aplicaveis.length - 1]
	);
</script>

<svelte:window onkeydown={(e) => guia.activo && e.key === 'Escape' && terminar()} />

{#if guia.activo && guia.passo && caixa}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div class="veu" onclick={() => (ultimo ? terminar() : guia.avancar())}></div>
	<div
		class="foco"
		style="left: {caixa.x}px; top: {caixa.y}px; width: {caixa.w}px; height: {caixa.h}px"
	></div>

	<div
		class="cartao"
		role="dialog"
		aria-modal="true"
		aria-label="Guia da aplicação"
		style="top: {posicaoCartao?.top ?? 0}px"
		bind:clientHeight={alturaCartao}
	>
		<h2>{guia.passo.titulo}</h2>
		<p class="texto">{guia.passo.texto}</p>
		<div class="accoes">
			<button class="saltar" onclick={terminar}>
				{ultimo ? 'Fechar' : 'Saltar o guia'}
			</button>
			{#if guia.indice > 0}
				<button class="atras" onclick={() => guia.recuar()} aria-label="Passo anterior">←</button>
			{/if}
			<button class="seguinte" onclick={() => (ultimo ? terminar() : guia.avancar())}>
				{ultimo ? 'Terminar' : 'Seguinte'}
			</button>
		</div>
	</div>
{/if}

<style>
	/* acima de tudo o que a app tem: a bolha de opinião vive no 20/21 */
	.veu {
		position: fixed;
		inset: 0;
		z-index: 40;
	}
	.foco {
		position: fixed;
		z-index: 41;
		border-radius: 10px;
		/* o escuro em volta é a sombra deste rectângulo, e sombras não apanham cliques */
		box-shadow: 0 0 0 9999px rgb(0 0 0 / 0.62);
		outline: 2px solid var(--cartao);
		pointer-events: none;
		transition: left 0.18s, top 0.18s, width 0.18s, height 0.18s;
	}
	.cartao {
		position: fixed;
		z-index: 42;
		right: var(--e-3);
		left: var(--e-3);
		max-width: 26rem;
		margin: 0 auto;
		padding: var(--e-4);
		border-radius: var(--raio-cartao);
		border: 1px solid var(--borda);
		background: var(--cartao);
		box-shadow: 0 8px 28px rgb(0 0 0 / 0.3);
		transition: top 0.18s;
	}
	@media (prefers-reduced-motion: reduce) {
		.foco, .cartao { transition: none; }
	}

	h2 {
		margin: 0 0 var(--e-2);
		font-size: var(--t-titulo);
		color: var(--acento);
	}
	.texto {
		margin: 0 0 var(--e-4);
		font-size: var(--t-base);
		line-height: 1.5;
		color: var(--texto-2);
	}

	.accoes { display: flex; align-items: center; gap: var(--e-2); }
	button {
		min-height: 44px;
		padding: 0 var(--e-4);
		border-radius: var(--raio);
		font: inherit;
		font-size: var(--t-base);
		cursor: pointer;
	}
	.saltar {
		flex: 1;
		border: 0;
		background: none;
		text-align: left;
		padding-left: 0;
		color: var(--suave);
	}
	.atras {
		border: 1px solid var(--borda);
		background: var(--cartao);
		color: var(--texto-2);
		padding: 0 var(--e-3);
	}
	.seguinte {
		border: 1px solid var(--acento);
		background: var(--acento);
		color: var(--cartao);
		font-weight: 600;
	}
</style>
