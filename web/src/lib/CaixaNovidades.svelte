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
	import { RECOLHER_FEEDBACK } from './feedback';

	// um só objecto para toda a app, e não uma instância deste componente: é o que permite ao
	// menu reabrir esta caixa. Ver o cabeçalho do `novidades.svelte.ts`.
	const n = novidades;
	// no arranque e só no cliente: o `localStorage` não existe durante o build
	$effect(() => n.arrancar());
</script>

{#if n.aberta}
	<!-- `role="status"` e não `dialog`: não há nada a decidir aqui, e um diálogo obrigaria a
	     prender o foco dentro dele para ser honesto com quem navega por teclado -->
	<div class="caixa" class:comBolha={RECOLHER_FEEDBACK} role="status">
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
		--fundo: calc(52px + env(safe-area-inset-bottom) + var(--e-3));
		bottom: var(--fundo);
		max-width: 30rem;
		margin-inline: auto;
		/* **A caixa tem de caber, e com nove pontos não cabia.** Ancorada em baixo e sem tecto,
		   ela crescia para cima até sair do ecrã — e medido a 375×812 com a lista da 1.1, o
		   último ponto ficava cortado e sem forma de chegar lá. Passou a ser um defeito a sério
		   no dia em que o menu a deixou reabrir: até aí só a via quem acabava de actualizar, e
		   uma vez. O `4.5rem` é a folga do cabeçalho, para a caixa nunca passar por baixo dele. */
		max-height: calc(100vh - var(--fundo) - 4.5rem);
		overflow-y: auto;
		/* sem isto, chegar ao fim da lista continuava a rolar a página atrás da caixa */
		overscroll-behavior: contain;
		padding: var(--e-4);
		background: var(--cartao);
		border: 1px solid var(--borda);
		border-radius: var(--raio-cartao);
		box-shadow: 0 6px 24px rgb(0 0 0 / 0.18);
	}
	/* colado ao topo da caixa: numa lista que rola, o botão de fechar tem de continuar à mão */
	.cabeca { display: flex; align-items: center; justify-content: space-between; gap: var(--e-3);
		position: sticky; top: calc(var(--e-4) * -1); background: var(--cartao);
		padding: var(--e-4) 0 var(--e-2); margin-top: calc(var(--e-4) * -1); }
	.cabeca strong { font-size: 0.82rem; }
	.cabeca button {
		min-width: 32px; min-height: 32px; padding: 0;
		font-size: 0.9rem; line-height: 1; color: var(--suave);
		background: none; border: 0; cursor: pointer;
	}
	ul { margin: var(--e-2) 0 0; padding-left: 1.1rem; }
	li { font-size: 0.76rem; line-height: 1.5; color: var(--texto-2); margin-bottom: var(--e-1); }
	li:last-child { margin-bottom: 0; }
	/* **A bolha de opinião tapava o último ponto.** As duas vivem no `z-index: 20` e no mesmo
	   canto, e a bolha é desenhada depois, logo ganha — medido a 375×812 com a lista da 1.1.
	   O `main` já reserva 60px para o mesmo problema; aqui a caixa sobe acima dela, que não
	   desperdiça espaço por dentro como um `padding` faria. */
	.caixa.comBolha { --fundo: calc(52px + env(safe-area-inset-bottom) + var(--e-4) + 60px); }
</style>
