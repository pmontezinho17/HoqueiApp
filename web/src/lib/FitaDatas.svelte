<script lang="ts">
	/**
	 * A fita de dias, com aspecto de calendário e não de bolas todas iguais.
	 *
	 * Tinha `Ontem · Hoje · Amanhã · qui 8 · sex 9`: três rótulos de larguras diferentes no
	 * meio de uma fila de datas, e era preciso contar nos dedos para saber que dia se estava
	 * a ver. Agora cada célula diz sempre a mesma coisa — dia da semana em cima, dia e mês
	 * em baixo — e o hoje distingue-se pela cor, não por uma palavra.
	 */
	let { dias, escolhido = $bindable() }: { dias: string[]; escolhido: string } = $props();

	const hoje = new Date().toISOString().slice(0, 10);
	const DIA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
	const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun',
		'jul', 'ago', 'set', 'out', 'nov', 'dez'];

	const celula = (iso: string) => {
		const d = new Date(`${iso}T00:00:00`);
		return { semana: DIA[d.getDay()], dia: d.getDate(), mes: MES[d.getMonth()] };
	};

	let fita = $state<HTMLElement | null>(null);
	// depende de `escolhido` para voltar a centrar quando o dia muda, e espera um frame
	// porque o DOM ainda não tem o atributo actualizado quando o efeito corre
	$effect(() => {
		escolhido;
		requestAnimationFrame(() =>
			fita?.querySelector('[aria-current="true"]')?.scrollIntoView({
				inline: 'center', block: 'nearest', behavior: 'instant'
			})
		);
	});
</script>

<div class="fita" bind:this={fita} role="tablist" aria-label="Dia">
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
	.fita {
		display: flex;
		gap: var(--e-1);
		overflow-x: auto;
		scrollbar-width: none;
		margin: 0 -0.9rem var(--e-3);
		padding: 0 0.9rem var(--e-1);
	}
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
