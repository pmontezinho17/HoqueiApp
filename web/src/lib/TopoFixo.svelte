<script lang="ts">
	/**
	 * O topo de um ecrã com separadores — o título e a barra — colado por baixo do cabeçalho
	 * da app, para não sair do sítio ao rolar.
	 *
	 * Pedido do dono a 31/10/2026, com o ecrã da equipa e o da competição desenhados à mão:
	 * *"quero que aquela parte de cima seja sempre fixa, ou seja, quando faço scroll para cima
	 * ou para baixo, que ela não se mexa"*. Numa competição com quatro séries, ou nos 20 jogos
	 * de uma equipa, rolar até ao fim e querer mudar de separador obrigava a subir tudo outra
	 * vez — é a mesma razão por que os filtros da lista de jogos já colam.
	 *
	 * **Um componente, e não o mesmo CSS em dois ecrãs**, pela mesma razão do
	 * `lib/Separadores.svelte`. A ficha de jogo não o usa: tem o seu próprio cromado, que
	 * encolhe o herói ao rolar.
	 *
	 * O `top` é a altura **medida** do cabeçalho (`--topo`, que o layout publica), e não um
	 * número escrito aqui. `z-index: 9` fica abaixo do cabeçalho (10), como o cromado da ficha.
	 * O fundo opaco é o que impede as tabelas de aparecerem por trás ao passar.
	 *
	 * A margem negativa e o `padding` com a mesma medida levam o fundo de ponta a ponta e por
	 * cima do espaço do `main`, sem mexer onde o conteúdo assenta; a barra lá dentro continua a
	 * ir de ponta a ponta com a sua própria margem.
	 */
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<div class="fixo">{@render children()}</div>

<style>
	.fixo {
		position: sticky;
		top: var(--topo, 60px);
		z-index: 9;
		background: var(--fundo);
		margin: calc(var(--e-4) * -1) -0.9rem 0.8rem;
		padding: var(--e-4) 0.9rem 0;
	}
</style>
