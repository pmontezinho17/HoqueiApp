<script lang="ts">
	/**
	 * O trenó do Pai Natal, puxado por duas renas, a atravessar o ecrã **uma vez por abertura da
	 * app**, três segundos depois de ela abrir. Doze segundos de voo, por cima da lista e por baixo
	 * do cabeçalho; não apanha toques. Quem pediu menos movimento no sistema não o vê — um trenó
	 * parado no meio do ecrã não é a mesma coisa.
	 *
	 * "Uma vez por abertura" vive no módulo e não no armazenamento: a política de privacidade
	 * enumera o que fica no aparelho, e isto não merece uma chave.
	 */
	import { onMount } from 'svelte';

	/** a altura do cabeçalho: o trenó voa logo por baixo dele e da fita das datas */
	let { topo = 60 }: { topo?: number } = $props();
	let voar = $state(false);
	onMount(() => {
		if (jaVoou) return;
		jaVoou = true;
		const t = setTimeout(() => (voar = true), 3000);
		return () => clearTimeout(t);
	});
</script>

<script lang="ts" module>
	let jaVoou = false;
</script>

{#if voar}
	<div class="ceu" aria-hidden="true" style="top: {topo + 150}px">
		<svg class="treno" viewBox="0 0 150 44" width="150" height="44" onanimationend={() => (voar = false)}>
			<!-- as renas, à frente: corpo, cabeça, pernas a galope e as hastes -->
			{#each [0, 34] as x (x)}
				<g transform="translate({x} 6)" fill="#8d5a3b" stroke="#6d4c41" stroke-width="0.8">
					<ellipse cx="14" cy="16" rx="10" ry="5" />
					<circle cx="4" cy="10" r="3.6" />
					<path d="M2 7 L-1 1 M-1 1 L-3 2 M-1 1 L0 -1 M5 7 L6 1 M6 1 L4 0 M6 1 L8 0" fill="none" stroke-linecap="round" />
					<path d="M8 20 L5 27 M11 20 L12 27 M18 20 L21 26 M21 19 L25 24" fill="none" stroke-width="1.6" stroke-linecap="round" />
				</g>
			{/each}
			<circle cx="1.5" cy="16" r="1.4" fill="#e53935" />
			<!-- as rédeas -->
			<path d="M24 20 Q60 30 88 24" fill="none" stroke="#a1887f" stroke-width="0.8" />
			<!-- o trenó com o Pai Natal e o saco das prendas -->
			<path d="M84 34 Q86 40 96 40 L140 40 Q146 40 147 35" fill="none" stroke="#795548" stroke-width="1.8" stroke-linecap="round" />
			<path d="M88 22 L136 22 Q142 22 140 30 L134 36 L94 36 Q88 36 88 30 Z" fill="#c62828" stroke="#8e0000" stroke-width="0.8" />
			<path d="M88 24 L136 24" stroke="#fbc02d" stroke-width="1.6" />
			<ellipse cx="128" cy="15" rx="9" ry="8" fill="#8d6e63" />
			<path d="M124 8 Q128 5 132 8" fill="none" stroke="#5d4037" stroke-width="1.2" />
			<rect x="100" y="12" width="14" height="12" rx="4" fill="#d32f2f" />
			<circle cx="107" cy="9" r="4.2" fill="#f6c9a8" />
			<path d="M102 9 Q103 16 107 16 Q111 16 112 9 Q109 12 107 12 Q105 12 102 9 Z" fill="#fff" />
			<path d="M102.5 7 Q105 0 112 3 L111.5 7 Z" fill="#d32f2f" />
			<circle cx="112.5" cy="3" r="1.5" fill="#fff" />
		</svg>
	</div>
{/if}

<style>
	.ceu { position: fixed; left: 0; right: 0; height: 60px;
		/* acima da fita das datas (8) e dos filtros (7), que o tapavam; abaixo do cabeçalho (10) */
		pointer-events: none; z-index: 9; overflow: hidden; }
	.treno { position: absolute; left: 100%; top: 6px;
		animation: voo 12s linear forwards, balanco 1.6s ease-in-out infinite; }
	@keyframes voo { from { left: 100%; } to { left: -170px; } }
	@keyframes balanco { 0%, 100% { margin-top: 0; } 50% { margin-top: 8px; } }
	@media (prefers-reduced-motion: reduce) { .ceu { display: none; } }
</style>
