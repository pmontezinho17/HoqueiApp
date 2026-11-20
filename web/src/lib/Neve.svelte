<script lang="ts">
	/**
	 * Neve a cair, **muito suave** — o pedido foi *"para não estar a abusar muito"*.
	 *
	 * Vinte flocos pequenos, devagar (de 14 a 26 s a atravessar o ecrã), meio transparentes e por
	 * baixo do cabeçalho e da barra: nunca tapam um botão nem um resultado, e o dedo passa por
	 * eles. As posições são fixas e não aleatórias, para o ecrã ser o mesmo a cada abertura e uma
	 * captura poder ser comparada com outra. Quem pediu menos movimento no sistema não vê neve
	 * nenhuma, que é a resposta honesta a esse pedido.
	 */
	const FLOCOS = Array.from({ length: 20 }, (_, i) => ({
		esquerda: (i * 37) % 100,
		tamanho: 2 + ((i * 7) % 4),
		duracao: 14 + ((i * 11) % 13),
		atraso: -((i * 13) % 26),
		balanco: i % 2 ? 12 : -12
	}));
</script>

<div class="neve" aria-hidden="true">
	{#each FLOCOS as f, i (i)}
		<i style="left: {f.esquerda}%; width: {f.tamanho}px; height: {f.tamanho}px;
			animation-duration: {f.duracao}s; animation-delay: {f.atraso}s; --balanco: {f.balanco}px"></i>
	{/each}
</div>

<style>
	.neve { position: fixed; inset: 0; pointer-events: none; z-index: 5; overflow: hidden; }
	i { position: absolute; top: -10px; border-radius: 50%; background: var(--neve, #b8cde3);
		opacity: 0.75; animation-name: cair; animation-timing-function: linear;
		animation-iteration-count: infinite; }
	@keyframes cair {
		0% { transform: translate(0, -10px); }
		50% { transform: translate(var(--balanco), 50vh); }
		100% { transform: translate(0, 105vh); }
	}
	/* no escuro a neve é branca; no claro um azul-acinzentado, senão desaparecia no branco */
	:global(:root[data-tema='escuro']) .neve { --neve: #ffffff; }
	@media (prefers-color-scheme: dark) { :global(:root:not([data-tema='claro'])) .neve { --neve: #ffffff; } }
	@media (prefers-reduced-motion: reduce) { .neve { display: none; } }
</style>
