<script lang="ts" generics="T extends string">
	/**
	 * A barra de separadores da app: ícone, o nome por baixo, um sublinhado no escolhido.
	 *
	 * **Uma barra só, e não uma por ecrã.** Nasceu na ficha de jogo; a competição e a equipa
	 * tinham botões com texto, cada uma com o seu desenho. O dono pediu-o a 31/10/2026: *"Temos
	 * de ter a aplicação uniforme, com o mesmo layout, caso contrário a experiência de
	 * utilizador não é a melhor"*. Três desenhos para a mesma coisa obrigavam a reaprender cada
	 * ecrã, e um componente é o que impede que voltem a divergir à próxima alteração.
	 *
	 * **O nome por baixo do ícone**, como na barra de baixo da app, desde 31/10/2026: até aí era
	 * só o ícone, com o nome no `aria-label`, e o dono, ao ver a barra na equipa, não percebeu o
	 * dos jogos. Um ícone sozinho obriga a adivinhar; com o nome não há o que adivinhar.
	 *
	 * **De ponta a ponta do ecrã** — quem a usa tira-lhe a margem do `main`: ver a `.barra` na
	 * competição e na equipa, e a `.reserva` na ficha de jogo.
	 */
	import Icone from './Icone.svelte';

	type Separador = {
		valor: T;
		/** o nome completo, que se ouve por voz */
		rotulo: string;
		/** o que se lê por baixo do ícone, quando o `rotulo` não cabe; por omissão é o `rotulo` */
		curto?: string;
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
			aria-label={s.curto ? s.rotulo : undefined} onclick={() => escolher(s.valor)}
		><Icone nome={s.icone} tamanho={21} /><span>{s.curto ?? s.rotulo}</span></button>
	{/each}
</div>

<style>
	.tabs {
		display: flex;
		background: var(--cartao);
		border-bottom: 1px solid var(--borda);
	}
	/* O ícone e o nome no mesmo tamanho da barra de baixo (21px e `--t-micro`): são a mesma
	   ideia, um nível acima e outro abaixo. Só 2px de lado: medido a 31/10/2026, o nome mais
	   comprido, "Classificação", tem 69px, e com cinco separadores na ficha de jogo cada um tem
	   75px a 375px — com 4px de cada lado já saía cortado. */
	.tabs button {
		flex: 1 1 0; min-width: 0; min-height: 52px; padding: var(--e-2) var(--e-0);
		display: flex; flex-direction: column; align-items: center; justify-content: center;
		gap: 2px; font: inherit; font-size: var(--t-micro);
		cursor: pointer; background: none; border: 0;
		border-bottom: 2px solid transparent;
		color: var(--suave);
	}
	.tabs span { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.tabs button[aria-selected='true'] {
		color: var(--acento); font-weight: 600;
		border-bottom-color: var(--acento);
	}
	.tabs button[aria-selected='true'] :global(svg) { color: var(--acento); }
	/* A câmara é vermelha esteja ou não escolhida — é a marca de "este dá para ver", e a
	   selecção já se lê no sublinhado. A regra vem **depois** da do separador escolhido de
	   propósito: têm a mesma especificidade, e é a ordem que decide. */
	.tabs button.aoVivo :global(svg) { color: var(--directo); }
</style>
