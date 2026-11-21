<script lang="ts">
	/**
	 * O enfeite de Natal de cada ícone da barra de baixo (`natal.svelte.ts`): um gorro nos Jogos,
	 * azevinho no escudo do clube, e um laço de prenda na taça das Competições.
	 *
	 * Nasceu da segunda volta, a 20/11/2026: a primeira tinha três bolas penduradas por baixo da
	 * barra e um Pai Natal sentado na ponta, e o dono não gostou — *"tens de ser um pouco mais
	 * criativo"*. Os enfeites passaram a pertencer aos ícones, e não a estar ao lado deles.
	 *
	 * Cores fixas e não do tema: são objectos, e um gorro é vermelho nos dois.
	 */
	let { nome }: { nome: string } = $props();
</script>

{#if nome === 'jogos'}
	<svg class="enfeite gorro" viewBox="0 0 24 20" width="15" height="12" aria-hidden="true">
		<path d="M2 17 Q6 2 19 4 Q14 8 14 17 Z" fill="#d32f2f" />
		<circle cx="19.5" cy="4" r="2.4" fill="#fff" stroke="#ddd" stroke-width="0.5" />
		<rect x="0.5" y="15" width="16" height="4.5" rx="2.2" fill="#fff" stroke="#ddd" stroke-width="0.5" />
	</svg>
{:else if nome === 'clube'}
	<svg class="enfeite azevinho" viewBox="0 0 24 16" width="16" height="11" aria-hidden="true">
		<path d="M12 9 C8 2 2 4 1 8 C4 7 5 10 3 12 C7 13 10 12 12 9 Z" fill="#2e7d32" />
		<path d="M12 9 C16 2 22 4 23 8 C20 7 19 10 21 12 C17 13 14 12 12 9 Z" fill="#388e3c" />
		<circle cx="10.5" cy="9.5" r="2.1" fill="#d32f2f" />
		<circle cx="13.6" cy="9.2" r="2.1" fill="#e53935" />
		<circle cx="12" cy="12" r="2.1" fill="#c62828" />
	</svg>
{:else if nome === 'prova'}
	<svg class="enfeite laco" viewBox="0 0 24 14" width="16" height="9" aria-hidden="true">
		<path d="M12 7 C7 0 1 1 2 6 C3 10 8 9 12 7 Z" fill="#e53935" />
		<path d="M12 7 C17 0 23 1 22 6 C21 10 16 9 12 7 Z" fill="#d32f2f" />
		<path d="M11 7 L8 13 M13 7 L16 13" stroke="#c62828" stroke-width="1.8" stroke-linecap="round" />
		<circle cx="12" cy="7" r="2.3" fill="#b71c1c" />
	</svg>
{/if}

<style>
	.enfeite { position: absolute; pointer-events: none; }
	/* o gorro torto no canto do ícone, como se lho tivessem posto à pressa */
	.gorro { top: -7px; right: -7px; transform: rotate(18deg); }
	/* à esquerda: à direita está o número de equipas seguidas, e tapavam-se um ao outro */
	.azevinho { top: -5px; left: -9px; }
	/* o laço por cima da taça, no meio, como uma prenda */
	.laco { top: -6px; left: 50%; transform: translateX(-50%); }
</style>
