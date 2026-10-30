<script lang="ts" generics="T extends string">
	/**
	 * A barra de separadores da app: ícones, um sublinhado no escolhido, o nome para quem lê
	 * por voz.
	 *
	 * **Uma barra só, e não uma por ecrã.** Nasceu na ficha de jogo; a competição e a equipa
	 * tinham botões com texto, cada uma com o seu desenho. O dono pediu-o a 31/10/2026: *"Temos
	 * de ter a aplicação uniforme, com o mesmo layout, caso contrário a experiência de
	 * utilizador não é a melhor"*. Três desenhos para a mesma coisa obrigavam a reaprender cada
	 * ecrã, e um componente é o que impede que voltem a divergir à próxima alteração.
	 *
	 * Ícones e não texto, como na ficha: cabem de ponta a ponta sem apertar a 375px, e o rótulo
	 * continua a existir no `aria-label` e no `title`.
	 */
	import Icone from './Icone.svelte';

	type Separador = {
		valor: T;
		rotulo: string;
		icone: string;
		/** `aoVivo` pinta a câmara de vermelho, escolhida ou não — ver a ficha de jogo */
		classe?: string;
	};
	let {
		separadores,
		activo,
		escolher,
		guia
	}: {
		separadores: Separador[];
		activo: T;
		escolher: (valor: T) => void;
		/** a marca por onde o guia da app aponta para esta barra */
		guia?: string;
	} = $props();
</script>

<div class="tabs" role="tablist" data-guia={guia}>
	{#each separadores as s (s.valor)}
		<button class={s.classe} role="tab" aria-selected={activo === s.valor}
			aria-label={s.rotulo} title={s.rotulo} onclick={() => escolher(s.valor)}
		><Icone nome={s.icone} tamanho={22} /></button>
	{/each}
</div>

<style>
	.tabs {
		display: flex;
		background: var(--cartao);
		border-bottom: 1px solid var(--borda);
	}
	.tabs button {
		flex: 1 1 0; min-height: 46px; padding: var(--e-2) 0;
		display: flex; align-items: center; justify-content: center;
		cursor: pointer; background: none; border: 0;
		border-bottom: 2px solid transparent;
		color: var(--suave);
	}
	.tabs button[aria-selected='true'] {
		color: var(--acento);
		border-bottom-color: var(--acento);
	}
	.tabs button[aria-selected='true'] :global(svg) { color: var(--acento); }
	/* A câmara é vermelha esteja ou não escolhida — é a marca de "este dá para ver", e a
	   selecção já se lê no sublinhado. A regra vem **depois** da do separador escolhido de
	   propósito: têm a mesma especificidade, e é a ordem que decide. */
	.tabs button.aoVivo :global(svg) { color: var(--directo); }
</style>
