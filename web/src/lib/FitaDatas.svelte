<script lang="ts">
	// Fita horizontal em vez de setas `‹ Hoje ›`: vê-se o contexto e navega-se por arrasto.
	// É o padrão da app nativa da FotMob, que o site móvel deles não usa.
	let { dias, escolhido = $bindable() }: { dias: string[]; escolhido: string } = $props();

	const hoje = new Date().toISOString().slice(0, 10);
	const DIA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

	function rotulo(iso: string) {
		if (iso === hoje) return 'Hoje';
		const d = new Date(`${iso}T00:00:00`);
		const delta = Math.round((d.getTime() - new Date(`${hoje}T00:00:00`).getTime()) / 864e5);
		if (delta === 1) return 'Amanhã';
		if (delta === -1) return 'Ontem';
		return `${DIA[d.getDay()]} ${d.getDate()}`;
	}

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
		<button
			role="tab" aria-current={d === escolhido} class:hoje={d === hoje}
			onclick={() => (escolhido = d)}
		>{rotulo(d)}</button>
	{/each}
</div>

<style>
	.fita { display: flex; gap: 0.25rem; overflow-x: auto; scrollbar-width: none;
		margin: 0 -0.9rem 0.6rem; padding: 0 0.9rem 0.3rem; }
	.fita::-webkit-scrollbar { display: none; }
	button {
		flex: 0 0 auto; min-height: 44px; padding: 0.3rem 0.65rem; cursor: pointer;
		font-size: 0.76rem; white-space: nowrap; border-radius: 999px;
		border: 1px solid var(--borda); background: var(--cartao); color: var(--suave);
	}
	button.hoje { font-weight: 600; }
	button[aria-current='true'] {
		background: var(--acento); border-color: var(--acento);
		color: var(--cartao); font-weight: 600;
	}
</style>
