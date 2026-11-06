<script lang="ts">
	/**
	 * Arrastar o dedo para o lado muda de página.
	 *
	 * Serve os dias na lista de jogos e os separadores da ficha de jogo, da competição e da
	 * equipa: em todos o que se quer é ver a página a seguir o dedo, e não saltar quando ele
	 * se levanta.
	 *
	 * **Nas pontas trava, e não passa ao menu do lado.** A 31/10/2026 experimentou-se: para
	 * lá do último separador dos Jogos, do Meu Clube e das Competições o arrasto levava ao
	 * menu vizinho da barra de baixo. O dono testou-o no telemóvel e preferiu sem: *"Prefiro
	 * que não mudes entre menus inferiores. Gosto do resto do feeling."*
	 *
	 * Porque é feito à mão e não com `scroll-snap`: um contentor com scroll horizontal
	 * rouba também o scroll vertical (quando um eixo tem scroll, o outro deixa de poder ser
	 * `visible`), e um sábado com 41 jogos é precisamente uma página alta que se percorre na
	 * vertical. Com `touch-action: pan-y` o browser fica com o arrasto vertical, que é o
	 * mais usado, e só o horizontal nos chega aos *pointer events*.
	 *
	 * Os dias vizinhos ficam montados em posição absoluta — não entram no fluxo, logo não
	 * alteram a altura — e `overflow-x: clip` corta-os na horizontal. O `clip` é o único
	 * valor que pode emparelhar com `overflow-y: visible` sem criar contentor de scroll; sem
	 * ele (Safari < 16) o gesto desliga-se e fica só a fita, que continua a funcionar.
	 */
	import type { Snippet } from 'svelte';

	let {
		itens,
		escolhido = $bindable(),
		progresso = $bindable(0),
		pagina
	}: {
		/** as páginas, pela ordem em que se arrastam */
		itens: string[];
		escolhido: string;
		/**
		 * Fracção de página já arrastada, de −1 a 1 — negativa a caminhar para a página
		 * seguinte. É o que permite à fita de datas lá em cima acompanhar o dedo em vez de
		 * saltar no fim.
		 */
		progresso?: number;
		/** o conteúdo de um dia, chamado uma vez por página montada */
		pagina: Snippet<[string]>;
	} = $props();

	const idx = $derived(itens.indexOf(escolhido));
	const anterior = $derived(idx > 0 ? itens[idx - 1] : null);
	const seguinte = $derived(idx >= 0 && idx < itens.length - 1 ? itens[idx + 1] : null);

	let caixa = $state<HTMLElement | null>(null);
	/** deslocamento horizontal em px: o arrasto em curso, ou a animação a assentar */
	let dx = $state(0);
	/** largura de uma página, medida — é por ela que se converte px em fracção */
	let largura = $state(0);

	let pendente = 0; // −1 / +1: o dia para onde vamos quando a animação acabar
	let gesto: number | null = null; // pointerId do gesto em curso
	let x0 = 0;
	let y0 = 0;
	let eixo: '' | 'x' | 'y' = '';
	/** um arrasto horizontal não deve disparar o clique no jogo que estava sob o dedo */
	let engolirClique = false;
	let quadro = 0;
	let salvaguarda: ReturnType<typeof setTimeout> | undefined;

	// o que a fita de datas lê para acompanhar o dedo
	$effect(() => {
		progresso = largura ? dx / largura : 0;
	});

	/**
	 * A faixa estica-se até à barra de baixo, mesmo quando a página é curta.
	 *
	 * Sem isto o gesto só pegava por cima do conteúdo. O dono deu por isso a 31/10/2026 — *"só
	 * funciona quando eu faço o gesto de deslizar em textos, pois se fizer numa parte que não
	 * tenha nada, não dá"* — e medi: num dia com dois jogos a faixa acabava aos 424px e a barra
	 * de baixo começava aos 759px. Os 335px pelo meio não eram de ninguém.
	 *
	 * A conta faz-se com medidas e não com números escritos aqui: onde a faixa começa, a
	 * altura da barra e o espaço que o `main` reserva por baixo (que muda com a bolha das
	 * sugestões). A `folga` — o que o `main` reserva para lá da barra — entra como
	 * `padding-bottom` dos carris e sai como margem negativa da faixa. Assim, numa página
	 * curta a faixa chega à barra sem o ecrã ganhar scroll, e numa página longa fica tudo como
	 * estava.
	 */
	let minimo = $state(0);
	let folga = $state(0);
	function medir() {
		if (!caixa) return;
		const barra = document.querySelector('nav.barra')?.getBoundingClientRect().height ?? 0;
		const main = caixa.closest('main');
		const reserva = main ? parseFloat(getComputedStyle(main).paddingBottom) || 0 : 0;
		const acima = caixa.getBoundingClientRect().top + scrollY;
		folga = Math.max(0, reserva - barra);
		minimo = Math.max(0, innerHeight - acima - barra);
	}
	$effect(() => {
		if (!caixa) return;
		medir();
		// o que está por cima da faixa muda de altura (um título que parte em duas linhas, os
		// filtros que aparecem): observar o corpo apanha tudo, e a conta é barata
		const obs = new ResizeObserver(medir);
		obs.observe(document.body);
		addEventListener('resize', medir);
		return () => {
			obs.disconnect();
			removeEventListener('resize', medir);
		};
	});

	const DECIDIR = 8; // px de movimento antes de escolher o eixo
	const suportado = typeof CSS !== 'undefined' && CSS.supports?.('overflow-x', 'clip');
	const semAnimacao = () =>
		typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

	/**
	 * Os bordos do ecrã são do sistema: no Safari e no Android, arrastar a partir do bordo é
	 * "voltar atrás". Um gesto que comece ali fica para eles, e não para os dois ao mesmo tempo.
	 */
	const BORDO = 20;

	function baixo(e: PointerEvent) {
		if (!suportado || !e.isPrimary) return;
		if (e.pointerType === 'touch' && (e.clientX < BORDO || e.clientX > innerWidth - BORDO)) return;
		// Uma folha aberta (o "Adicionar ao calendário", nos Jogos da equipa) está por cima de
		// tudo mas vive dentro da página no DOM, e os eventos dela sobem até aqui. Arrastar lá
		// dentro mexia o separador por trás.
		if ((e.target as Element | null)?.closest?.('dialog')) return;
		// pegar a meio de uma animação é legítimo — pára-a e continua de onde ela ia
		cancelAnimationFrame(quadro);
		clearTimeout(salvaguarda);
		pendente = 0;
		gesto = e.pointerId;
		x0 = e.clientX;
		y0 = e.clientY;
		eixo = '';
		engolirClique = false;
	}

	function mover(e: PointerEvent) {
		if (e.pointerId !== gesto) return;
		const ax = e.clientX - x0;
		const ay = e.clientY - y0;
		if (eixo === '') {
			if (Math.abs(ax) < DECIDIR && Math.abs(ay) < DECIDIR) return;
			eixo = Math.abs(ax) > Math.abs(ay) ? 'x' : 'y';
		}
		if (eixo !== 'x') return;
		// Decidido o eixo, o gesto é nosso até o dedo se levantar, esteja ele por cima do que
		// estiver. Sem isto, um arrasto com rato que acabasse por cima da bolha das sugestões
		// (que é fixa e fica fora da faixa) entregava-lhe o `pointerup`, e a página ficava
		// meio arrastada — apanhado a 31/10/2026 ao testar esta faixa com o rato. No toque o
		// browser já faz isto sozinho; aqui fica explícito para os dois.
		if (!engolirClique) caixa?.setPointerCapture?.(e.pointerId);
		engolirClique = true;
		// sem página do outro lado o arrasto trava com resistência, em vez de mostrar vazio
		dx = (ax < 0 && !seguinte) || (ax > 0 && !anterior) ? ax * 0.15 : ax;
	}

	function largar(e: PointerEvent) {
		if (e.pointerId !== gesto) return;
		gesto = null;
		if (eixo !== 'x') {
			eixo = '';
			return;
		}
		eixo = '';
		const limiar = Math.min(90, largura * 0.22);
		const dir = dx <= -limiar && seguinte ? 1 : dx >= limiar && anterior ? -1 : 0;
		if (!dir) return animar(0);
		pendente = dir;
		if (semAnimacao()) return assentar();
		animar(-dir * largura);
	}

	/**
	 * A animação é feita quadro a quadro e **não** com uma transição CSS.
	 *
	 * Com a transição, o `dx` saltava logo para o valor final e só os píxeis é que
	 * interpolavam — o que chega para mover a lista, mas deixa de fora quem precise de
	 * acompanhar o movimento. A fita de datas lá em cima é isso: ou anda ao mesmo tempo,
	 * ou salta no fim. Aqui o `dx` percorre mesmo o caminho, e o `progresso` com ele.
	 */
	function animar(alvo: number) {
		cancelAnimationFrame(quadro);
		if (dx === alvo) return assentar();
		if (semAnimacao()) {
			dx = alvo;
			return assentar();
		}
		const inicio = dx;
		const delta = alvo - inicio;
		const t0 = performance.now();
		const DURACAO = 240;
		const passo = (t: number) => {
			const k = Math.min(1, (t - t0) / DURACAO);
			// easeOutCubic: sai depressa e encosta devagar, como um dedo a largar
			dx = inicio + delta * (1 - (1 - k) ** 3);
			if (k < 1) quadro = requestAnimationFrame(passo);
			else assentar();
		};
		quadro = requestAnimationFrame(passo);
		// **Salvaguarda.** O browser estrangula o `requestAnimationFrame` quando o separador
		// não está à vista — medido aqui mesmo: 2 quadros em 300 ms. Sem isto, bloquear o
		// ecrã a meio de um arrasto deixava a página meio deslizada até alguém lhe tocar
		// outra vez. Era a mesma rede que a versão com transição CSS tinha, e que eu tirei
		// ao trocar de mecanismo.
		clearTimeout(salvaguarda);
		salvaguarda = setTimeout(() => {
			dx = alvo;
			assentar();
		}, DURACAO + 250);
	}

	/**
	 * Fim do movimento. A troca do dia e o regresso a `dx = 0` acontecem na mesma
	 * actualização: os carris estavam a `−largura` com o dia seguinte à direita e passam a
	 * `0` com esse dia ao centro — os mesmos pixels, sem salto.
	 */
	function assentar() {
		cancelAnimationFrame(quadro);
		clearTimeout(salvaguarda);
		if (pendente) {
			escolhido = itens[idx + pendente] ?? escolhido;
			pendente = 0;
		}
		dx = 0;
	}
</script>

<div
	class="faixa"
	style:min-height={minimo ? `${minimo}px` : undefined}
	style:margin-bottom={folga ? `${-folga}px` : undefined}
	bind:this={caixa}
	bind:clientWidth={largura}
	role="group"
	aria-label="Conteúdo que se arrasta"
	onpointerdown={baixo}
	onpointermove={mover}
	onpointerup={largar}
	onpointercancel={largar}
	onclickcapture={(e) => {
		if (!engolirClique) return;
		engolirClique = false;
		e.preventDefault();
		e.stopPropagation();
	}}
>
	<div class="carris" style="--dx: {dx}px" style:padding-bottom={folga ? `${folga}px` : undefined}>
		{#if anterior}
			<div class="pag esquerda" aria-hidden="true" inert>{@render pagina(anterior)}</div>
		{/if}
		<div class="pag">{@render pagina(escolhido)}</div>
		{#if seguinte}
			<div class="pag direita" aria-hidden="true" inert>{@render pagina(seguinte)}</div>
		{/if}
	</div>
</div>

<style>
	.faixa {
		/* sangra até à margem do ecrã para o corte acontecer no bordo, e não a 0.9rem dele */
		margin: 0 -0.9rem;
		overflow-x: clip;
		overflow-y: visible;
		/* o browser trata o arrasto vertical; o horizontal é nosso */
		touch-action: pan-y;
	}
	.carris {
		position: relative;
		transform: translate3d(var(--dx), 0, 0);
	}
	/* O recuo de 0.9rem do `main` vive aqui dentro, em cada página, e não na faixa: assim a
	   caixa dos carris tem exactamente a largura do ecrã, os vizinhos a `100%` ficam a uma
	   largura de ecrã de distância — o mesmo valor por que o arrasto translada — e não sobra
	   a fenda de 0.9rem de conteúdo vizinho que se via nos bordos. */
	.pag {
		padding: 0 0.9rem;
	}
	/*
	  Fora do fluxo: os vizinhos não contam para a altura da faixa.
	  Mas estar fora do fluxo não os tira do **scroll** da página — e com os blocos todos
	  abertos por omissão isso passou a ver-se: um domingo ao lado de um sábado de 41 jogos
	  esticava a barra de scroll por centenas de píxeis de nada. `max-height: 100%` corta-os
	  à altura do dia que está à vista; durante o arrasto o dia que entra pode aparecer
	  cortado em baixo, e volta ao normal mal assente.
	*/
	.pag.esquerda,
	.pag.direita {
		position: absolute;
		top: 0;
		width: 100%;
		max-height: 100%;
		overflow: hidden;
	}
	.pag.esquerda {
		right: 100%;
	}
	.pag.direita {
		left: 100%;
	}

	/* sem `overflow: clip` não há onde esconder os vizinhos: o gesto fica desligado no
	   script e aqui tiram-se da frente */
	@supports not (overflow-x: clip) {
		.pag.esquerda,
		.pag.direita {
			display: none;
		}
	}
</style>
