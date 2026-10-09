<script lang="ts">
	/**
	 * Perguntas frequentes (P11.11).
	 *
	 * **Escrito antes de haver perguntas, e o pedido veio com essa ressalva.** O risco é
	 * conhecido: um FAQ feito do lado de dentro responde ao que *nós* achamos que se pergunta.
	 * Duas regras saíram disso e estão a ser respeitadas aqui.
	 *
	 * 1. **Curto.** Treze perguntas, não trinta. Uma lista comprida de perguntas que ninguém
	 *    fez esconde as três que importam.
	 * 2. **Revisitar** depois do primeiro grupo de testes e do que chegar pelo botão de
	 *    opinião. Isto é um ponto de partida, não a versão final.
	 *
	 * ## A regra que impede o apodrecimento
	 *
	 * Três destas respostas dependem de coisas que vão mudar — a cadência, as notificações e
	 * as grafias erradas dos clubes. Essas **não repetem o número aqui**: apontam para o sítio
	 * onde a verdade vive, que é a própria app. "A última actualização está em «Sobre a app»"
	 * continua verdade depois de a cadência mudar; "actualiza de 30 em 30 segundos" não.
	 *
	 * É por isso que a resposta da cadência fala de *como* funciona e não de *quanto* — e
	 * mesmo assim é a primeira candidata a ficar desactualizada. Quem mudar a cadência no
	 * `dados.yml` passa por aqui.
	 */
	import { CONTACTO } from '$lib/contacto';
	import { PERGUNTAS } from '$lib/ajuda';
	import { APP_NOME } from '$lib/sitio';

	let aberta = $state<number | null>(null);
</script>

<svelte:head><title>Perguntas frequentes — {APP_NOME}</title></svelte:head>

<h1>Perguntas frequentes</h1>

<p class="intro">
	Ainda ninguém nos perguntou nada — estas são as perguntas que nós achamos que farias. Se a
	tua não estiver aqui, <a href="mailto:{CONTACTO}">manda-a</a> e ela passa a estar.
</p>

<ul class="lista">
	{#each PERGUNTAS as item, i (item.p)}
		<li>
			<button
				class="pergunta"
				aria-expanded={aberta === i}
				onclick={() => (aberta = aberta === i ? null : i)}
			>
				<span>{item.p}</span>
				<!-- o sinal roda em vez de trocar de carácter: um `+` que vira `−` pisca -->
				<svg class="sinal" class:aberto={aberta === i} viewBox="0 0 24 24" aria-hidden="true">
					<path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2"
						stroke-linecap="round" stroke-linejoin="round" />
				</svg>
			</button>
			{#if aberta === i}
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				<div class="resposta">{@html item.r}</div>
			{/if}
		</li>
	{/each}
</ul>

<style>
	h1 { font-size: 1.1rem; margin: 0 0 0.4rem; }
	.intro { font-size: 0.8rem; color: var(--suave); margin: 0 0 1rem; line-height: 1.5; }

	.lista { list-style: none; margin: 0; padding: 0; }
	.lista li { border-bottom: 1px solid var(--borda); }

	.pergunta { display: flex; align-items: center; gap: 0.6rem; width: 100%;
		padding: 0.75rem 0.2rem; font: inherit; font-size: 0.85rem; text-align: left;
		color: var(--texto); background: none; border: 0; cursor: pointer; }
	.pergunta:hover, .pergunta:focus-visible { background: var(--acento-fraco); outline: none; }
	.pergunta span { flex: 1; }

	.sinal { width: 18px; height: 18px; flex: 0 0 auto; color: var(--suave);
		transition: transform 0.15s ease; }
	.sinal.aberto { transform: rotate(180deg); }
	/* quem desligou as animações não leva a seta a rodar */
	@media (prefers-reduced-motion: reduce) { .sinal { transition: none; } }

	.resposta { font-size: 0.8rem; line-height: 1.6; color: var(--texto2);
		padding: 0 0.2rem 0.85rem; }
	.resposta :global(a) { color: var(--acento); }
</style>
