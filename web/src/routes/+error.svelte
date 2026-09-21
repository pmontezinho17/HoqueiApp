<script lang="ts">
	import { page } from '$app/state';
</script>

<div class="erro">
	<h1>Não foi possível carregar os jogos</h1>
	<p>{page.error?.message ?? 'Erro desconhecido.'}</p>
	<p class="dica">Verifica a ligação à internet e tenta de novo.</p>
	<button onclick={() => location.reload()}>Tentar de novo</button>
</div>

<style>
	.erro { text-align: center; padding: 3rem 1rem; }
	h1 { font-size: 1.1rem; margin-bottom: 0.5rem; }
	p { color: var(--suave); font-size: 0.9rem; margin: 0.3rem 0; }
	.dica { font-size: 0.82rem; }
	button {
		margin-top: 1.2rem; padding: 0.7rem 1.4rem; font-size: 0.95rem;
		min-height: 44px; border-radius: 8px; border: 0; cursor: pointer;
		background: var(--acento); color: #fff;
	}
</style>
