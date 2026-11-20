<script lang="ts">
	/**
	 * Neve acumulada em cima da barra de baixo, como num telhado — com dois pingos a escorrer.
	 * Estica com a barra quando ela encolhe a meio da página.
	 */
</script>

<svg class="neve-na-barra" viewBox="0 0 200 14" preserveAspectRatio="none" aria-hidden="true">
	<path d="M4 9 Q6 3 16 4 Q24 0 36 3 Q46 1 56 4 Q66 0 80 3 Q92 1 102 4 Q114 0 126 3 Q138 1 148 4
		Q160 0 172 3 Q186 1 196 6 Q199 9 196 10 L4 10 Q1 10 4 9 Z" fill="var(--neve-barra, #fff)" />
	<ellipse cx="62" cy="11" rx="2.2" ry="3" fill="var(--neve-barra, #fff)" />
	<ellipse cx="141" cy="11.5" rx="1.8" ry="2.6" fill="var(--neve-barra, #fff)" />
</svg>

<style>
	.neve-na-barra { position: absolute; left: 10px; right: 10px; top: -7px; width: calc(100% - 20px);
		height: 12px; pointer-events: none; filter: drop-shadow(0 1px 0.6px rgb(0 0 0 / 0.22)); }
	:global(:root[data-tema='escuro']) .neve-na-barra { --neve-barra: #e9f1fb; }
	@media (prefers-color-scheme: dark) {
		:global(:root:not([data-tema='claro'])) .neve-na-barra { --neve-barra: #e9f1fb; }
	}
</style>
