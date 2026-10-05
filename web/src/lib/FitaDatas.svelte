<script lang="ts">
	/**
	 * A fita de dias, com aspecto de calendário e não de bolas todas iguais.
	 *
	 * Tinha `Ontem · Hoje · Amanhã · qui 8 · sex 9`: três rótulos de larguras diferentes no
	 * meio de uma fila de datas, e era preciso contar nos dedos para saber que dia se estava
	 * a ver. Agora cada célula diz sempre a mesma coisa — dia da semana em cima, dia e mês
	 * em baixo — e o hoje distingue-se pela cor, não por uma palavra.
	 */
	let {
		dias,
		escolhido = $bindable(),
		progresso = 0
	}: {
		dias: string[];
		escolhido: string;
		/**
		 * Fracção de página já arrastada na lista lá em baixo, de −1 a 1. É o que faz esta
		 * fita andar **ao mesmo tempo** que os jogos em vez de saltar quando eles assentam.
		 */
		progresso?: number;
	} = $props();

	const hoje = new Date().toISOString().slice(0, 10);
	const DIA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
	const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun',
		'jul', 'ago', 'set', 'out', 'nov', 'dez'];

	const celula = (iso: string) => {
		const d = new Date(`${iso}T00:00:00`);
		return { semana: DIA[d.getDay()], dia: d.getDate(), mes: MES[d.getMonth()] };
	};

	let fita = $state<HTMLElement | null>(null);
	let primeira = true;
	/**
	 * Se a fita já está encostada ao topo.
	 *
	 * Só então leva o fio por baixo: em repouso, uma risca entre a fita e os chips separava
	 * duas coisas que andam juntas; colada, sem ela o conteúdo passa-lhe por baixo e parece
	 * cortado a meio.
	 */
	let colada = $state(false);
	$effect(() => {
		const ao = () => {
			if (!fita) return;
			const topo = parseFloat(getComputedStyle(fita).top) || 0;
			colada = fita.getBoundingClientRect().top <= topo + 0.5;
		};
		ao();
		addEventListener('scroll', ao, { passive: true });
		return () => removeEventListener('scroll', ao);
	});

	const actual = () => fita?.querySelector<HTMLElement>('[aria-current="true"]') ?? null;
	/** onde o scroll tem de estar para o dia escolhido ficar ao centro */
	const centro = (alvo: HTMLElement) =>
		alvo.offsetLeft - (fita!.clientWidth - alvo.offsetWidth) / 2;
	/** distância entre duas células, medida e não assumida — inclui o espaço entre elas */
	function passo(alvo: HTMLElement) {
		const irmao = (alvo.nextElementSibling ?? alvo.previousElementSibling) as HTMLElement | null;
		return irmao ? Math.abs(irmao.offsetLeft - alvo.offsetLeft) : alvo.offsetWidth;
	}

	/**
	 * Acompanha o dedo. Arrastar meia página para a esquerda roda a fita meia célula para
	 * a direita — é esta proporção que faz as duas coisas parecerem a mesma coisa.
	 */
	$effect(() => {
		const p = progresso;
		const alvo = actual();
		if (!fita || !alvo || !p) return;
		fita.scrollTo({ left: centro(alvo) - p * passo(alvo), behavior: 'auto' });
	});

	// Ao assentar: desliza até ao novo dia. Espera um frame porque o DOM ainda não tem o
	// `aria-current` actualizado quando o efeito corre. Na primeira vez não desliza — abrir
	// a app com a fita a correr sozinha é desconcertante.
	$effect(() => {
		escolhido;
		requestAnimationFrame(() => {
			const alvo = actual();
			if (!fita || !alvo) return;
			fita.scrollTo({ left: centro(alvo), behavior: primeira ? 'instant' : 'smooth' });
			primeira = false;
		});
	});
</script>

<div class="fita" class:colada bind:this={fita} role="tablist" aria-label="Dia">
	{#each dias as d (d)}
		{@const c = celula(d)}
		<button
			role="tab"
			aria-current={d === escolhido}
			class:hoje={d === hoje}
			aria-label={`${c.semana} ${c.dia} de ${c.mes}${d === hoje ? ', hoje' : ''}`}
			onclick={() => (escolhido = d)}
		>
			<span class="semana">{c.semana}</span>
			<span class="data">{c.dia} {c.mes}</span>
		</button>
	{/each}
</div>

<style>
	/*
	  Colada ao topo, debaixo do cabeçalho da app.
	  Ao rolar por um sábado de 41 jogos perdia-se de vista o dia que se estava a ver, e a
	  única forma de confirmar era voltar ao cima. `--topo` é a altura real do cabeçalho,
	  medida no layout — não um número escrito aqui que deixa de servir quando ele muda.
	*/
	.fita {
		position: sticky;
		top: var(--topo, 60px);
		z-index: 8;
		display: flex;
		gap: var(--e-1);
		overflow-x: auto;
		scrollbar-width: none;
		margin: 0 -0.9rem var(--e-3);
		padding: var(--e-2) 0.9rem var(--e-2);
		background: var(--fundo);
		border-bottom: 1px solid transparent;
	}
	.fita.colada { border-bottom-color: var(--borda); }
	.fita::-webkit-scrollbar { display: none; }

	button {
		flex: 0 0 auto;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1px;
		min-width: 3.5rem;
		min-height: 48px;
		padding: var(--e-2) var(--e-3);
		cursor: pointer;
		/* cantos de cartão e não de pílula: uma célula de calendário é um quadrado */
		border-radius: var(--raio);
		border: 1px solid var(--borda);
		background: var(--cartao);
		color: var(--texto-2);
	}
	.semana {
		font-size: var(--t-micro);
		letter-spacing: 0.04em;
		color: var(--suave);
	}
	.data {
		font-size: var(--t-pequeno);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	/* o hoje distingue-se pela cor mesmo quando não está escolhido — tirámos-lhe a palavra */
	button.hoje { border-color: var(--acento); }
	button.hoje .data,
	button.hoje .semana { color: var(--acento); }

	button[aria-current='true'] {
		background: var(--acento);
		border-color: var(--acento);
	}
	button[aria-current='true'] .data,
	button[aria-current='true'] .semana { color: var(--cartao); }
</style>
