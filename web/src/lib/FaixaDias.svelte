<script lang="ts">
	/**
	 * Arrastar o dedo para o lado muda de dia — o pedido do vídeo da theScore, onde a lista
	 * desliza e a fita de datas em cima acompanha.
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
		dias,
		escolhido = $bindable(),
		pagina
	}: {
		dias: string[];
		escolhido: string;
		/** o conteúdo de um dia, chamado uma vez por página montada */
		pagina: Snippet<[string]>;
	} = $props();

	const idx = $derived(dias.indexOf(escolhido));
	const anterior = $derived(idx > 0 ? dias[idx - 1] : null);
	const seguinte = $derived(idx >= 0 && idx < dias.length - 1 ? dias[idx + 1] : null);

	let caixa = $state<HTMLElement | null>(null);
	/** deslocamento horizontal em px: o arrasto em curso, ou a animação a assentar */
	let dx = $state(0);
	let suave = $state(false);

	let pendente = 0; // −1 / +1: o dia para onde vamos quando a animação acabar
	let gesto: number | null = null; // pointerId do gesto em curso
	let x0 = 0;
	let y0 = 0;
	let eixo: '' | 'x' | 'y' = '';
	/** um arrasto horizontal não deve disparar o clique no jogo que estava sob o dedo */
	let engolirClique = false;
	let salvaguarda: ReturnType<typeof setTimeout> | undefined;

	const DECIDIR = 8; // px de movimento antes de escolher o eixo
	const suportado = typeof CSS !== 'undefined' && CSS.supports?.('overflow-x', 'clip');
	const semAnimacao = () =>
		typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

	function baixo(e: PointerEvent) {
		if (!suportado || !e.isPrimary || suave) return;
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
		engolirClique = true;
		// sem dia do outro lado o arrasto trava com resistência, em vez de mostrar vazio
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
		const largura = caixa?.clientWidth ?? 320;
		const limiar = Math.min(90, largura * 0.22);
		const dir = dx <= -limiar && seguinte ? 1 : dx >= limiar && anterior ? -1 : 0;
		if (!dir) return animar(0);
		if (semAnimacao()) {
			pendente = dir;
			return assentar();
		}
		pendente = dir;
		animar(-dir * largura);
	}

	function animar(alvo: number) {
		if (dx === alvo) return assentar();
		suave = true;
		dx = alvo;
		// se o `transitionend` não chegar (página escondida a meio, por exemplo), não
		// podemos ficar presos com a transição ligada
		clearTimeout(salvaguarda);
		salvaguarda = setTimeout(assentar, 400);
	}

	/**
	 * Fim do movimento. A troca do dia e o regresso a `dx = 0` acontecem na mesma
	 * actualização que desliga a transição: os carris estavam a `−largura` com o dia
	 * seguinte à direita e passam a `0` com esse dia ao centro — os mesmos pixels, sem
	 * salto.
	 */
	function assentar() {
		clearTimeout(salvaguarda);
		suave = false;
		if (pendente) {
			escolhido = dias[idx + pendente] ?? escolhido;
			pendente = 0;
		}
		dx = 0;
	}
</script>

<div
	class="faixa"
	bind:this={caixa}
	role="group"
	aria-label="Jogos do dia"
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
	<div
		class="carris"
		class:suave
		style="--dx: {dx}px"
		ontransitionend={(e) => e.propertyName === 'transform' && assentar()}
	>
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
	.carris.suave {
		transition: transform 0.22s cubic-bezier(0.22, 0.61, 0.36, 1);
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
	@media (prefers-reduced-motion: reduce) {
		.carris.suave {
			transition: none;
		}
	}
</style>
