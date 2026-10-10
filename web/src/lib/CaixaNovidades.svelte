<script lang="ts">
	/**
	 * A caixa do "o que mudou", depois de uma actualização.
	 *
	 * **Aparece uma vez por versão e só a quem já usava a app** — a regra e a razão estão em
	 * `novidades.svelte.ts`. Pedida pelo dono a 10/10/2026, no mesmo pedido em que disse que
	 * estava saturado do aviso de actualização: as duas coisas andam juntas, porque o aviso
	 * deixou de aparecer a cada publicação e esta caixa é o que passa a dizer quando valeu a
	 * pena.
	 *
	 * O nome é `CaixaNovidades` e não `Novidades` porque o módulo de estado ao lado chama-se
	 * `novidades.svelte.ts`, pela convenção deste projecto, e os dois só diferiam na
	 * capitalização — o que num sistema de ficheiros que a ignora é o mesmo ficheiro.
	 *
	 * **Em baixo e não ao centro.** Não é um pedido de decisão nem um erro — é uma nota. Uma
	 * caixa ao centro com um véu por trás pára o que a pessoa ia fazer; esta deixa a lista de
	 * jogos à vista e fecha-se com um toque.
	 */
	import { novidades } from './novidades.svelte';

	const n = novidades();
	// no arranque e só no cliente: o `localStorage` não existe durante o build
	$effect(() => n.arrancar());
</script>

{#if n.aberta}
	<!-- `role="status"` e não `dialog`: não há nada a decidir aqui, e um diálogo obrigaria a
	     prender o foco dentro dele para ser honesto com quem navega por teclado -->
	<div class="caixa" role="status">
		<div class="cabeca">
			<strong>O que mudou</strong>
			<button type="button" onclick={() => n.fechar()} aria-label="Fechar">✕</button>
		</div>
		{#each n.lista as nova (nova.versao)}
			<ul>
				{#each nova.pontos as p (p)}
					<li>{p}</li>
				{/each}
			</ul>
		{/each}
	</div>
{/if}

<style>
	.caixa {
		position: fixed;
		/* acima da barra de navegação de baixo, que vive a 10 */
		z-index: 20;
		left: var(--e-4);
		right: var(--e-4);
		/* folga para a barra de baixo e para o recorte do telemóvel */
		bottom: calc(52px + env(safe-area-inset-bottom) + var(--e-3));
		max-width: 30rem;
		margin-inline: auto;
		padding: var(--e-4);
		background: var(--cartao);
		border: 1px solid var(--borda);
		border-radius: var(--raio-cartao);
		box-shadow: 0 6px 24px rgb(0 0 0 / 0.18);
	}
	.cabeca { display: flex; align-items: center; justify-content: space-between; gap: var(--e-3); }
	.cabeca strong { font-size: 0.82rem; }
	.cabeca button {
		min-width: 32px; min-height: 32px; padding: 0;
		font-size: 0.9rem; line-height: 1; color: var(--suave);
		background: none; border: 0; cursor: pointer;
	}
	ul { margin: var(--e-2) 0 0; padding-left: 1.1rem; }
	li { font-size: 0.76rem; line-height: 1.5; color: var(--texto-2); margin-bottom: var(--e-1); }
	li:last-child { margin-bottom: 0; }
</style>
