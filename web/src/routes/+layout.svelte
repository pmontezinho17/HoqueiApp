<script lang="ts">
	import { navigating } from '$app/state';
	let { children } = $props();
</script>

{#if navigating.to}
	<div class="barra" role="status" aria-label="A carregar"></div>
{/if}

<main>{@render children()}</main>

<style>
	:global(:root) {
		--fundo: #f6f7f9;
		--cartao: #fff;
		--texto: #15181d;
		--suave: #6b7280;
		--borda: #e4e6ea;
		--acento: #0a7d54;
	}
	@media (prefers-color-scheme: dark) {
		:global(:root) {
			--fundo: #0f1115;
			--cartao: #181b21;
			--texto: #e8eaed;
			--suave: #9aa1ab;
			--borda: #272b33;
			--acento: #34d399;
		}
	}
	:global(*) { box-sizing: border-box; }
	:global(body) {
		margin: 0;
		background: var(--fundo);
		color: var(--texto);
		font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
		-webkit-text-size-adjust: 100%;
	}
	main {
		/* mobile-first: 16px de goteira e nada que force scroll horizontal (W2.7) */
		max-width: 44rem;
		margin: 0 auto;
		padding: 1rem;
	}
	.barra {
		position: fixed; inset: 0 0 auto 0; height: 3px; background: var(--acento);
		animation: correr 1s ease-in-out infinite; transform-origin: left;
	}
	@keyframes correr { 0% { transform: scaleX(0); } 50% { transform: scaleX(0.7); } 100% { transform: scaleX(1); } }
</style>
