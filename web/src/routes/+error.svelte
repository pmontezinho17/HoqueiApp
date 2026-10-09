<script lang="ts">
	/**
	 * **Um 404 não é um problema de rede, e dizer que é manda a pessoa à procura no sítio
	 * errado.** Esta página dizia sempre "verifica a ligação à internet e tenta de novo",
	 * fosse qual fosse a causa — e durante um tempo era o que se via ao abrir um jogo que
	 * ainda não tinha ficha publicada, com a rede perfeita. A ficha deixou de dar erro a
	 * 09/10/2026 (ver `jogo/[id]/+page.ts`), mas a mentira ficava para o próximo 404.
	 *
	 * Agora um 404 diz que não encontrou e oferece o caminho de volta; qualquer outro estado
	 * continua a ser tratado como falha a carregar, que é quando a dica da rede serve e o
	 * botão de tentar outra vez tem sentido.
	 */
	import { page } from '$app/state';

	const naoEncontrado = $derived(page.status === 404);
</script>

<div class="erro">
	<h1>{naoEncontrado ? 'Não encontrámos isso' : 'Não foi possível carregar os jogos'}</h1>
	<p>{page.error?.message ?? 'Erro desconhecido.'}</p>
	{#if naoEncontrado}
		<a class="botao" href="/">Ver os jogos de hoje</a>
	{:else}
		<p class="dica">Verifica a ligação à internet e tenta de novo.</p>
		<button onclick={() => location.reload()}>Tentar de novo</button>
	{/if}
</div>

<style>
	.erro { text-align: center; padding: 3rem 1rem; }
	h1 { font-size: 1.1rem; margin-bottom: 0.5rem; }
	p { color: var(--suave); font-size: 0.9rem; margin: 0.3rem 0; }
	.dica { font-size: 0.82rem; }
	button, .botao {
		display: inline-block; margin-top: 1.2rem; padding: 0.7rem 1.4rem; font-size: 0.95rem;
		min-height: 44px; border-radius: 8px; border: 0; cursor: pointer;
		background: var(--acento); color: #fff; text-decoration: none;
		font-family: inherit; line-height: 1.6;
	}
</style>
