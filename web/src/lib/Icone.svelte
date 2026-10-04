<script lang="ts">
	/**
	 * Os ícones da caixa de informação do jogo. Em linha e com `currentColor`, como os do
	 * cabeçalho: nada de tipos de letra de ícones nem de pedidos a terceiros — a política de
	 * privacidade diz que não carregamos código de fora, e isso tem de continuar verdade.
	 *
	 * Decorativos: quem lê por voz ouve o texto da linha, que diz a mesma coisa e melhor.
	 */
	let { nome, tamanho = 15 }: { nome: string; tamanho?: number } = $props();
</script>

<svg
	viewBox="0 0 20 20"
	width={tamanho}
	height={tamanho}
	aria-hidden="true"
	fill="none"
	stroke="currentColor"
	stroke-width="1.8"
	stroke-linecap="round"
	stroke-linejoin="round"
>
	{#if nome === 'prova'}
		<!-- taça -->
		<path d="M6.5 3h7v3.5a3.5 3.5 0 0 1-7 0Z" />
		<path d="M6.5 4.2H4.3v1.1a2.4 2.4 0 0 0 2.2 2.4M13.5 4.2h2.2v1.1a2.4 2.4 0 0 1-2.2 2.4" />
		<path d="M10 10v3.5M7 17h6M8.5 13.5h3L12 17H8Z" />
	{:else if nome === 'data'}
		<rect x="3.2" y="4.6" width="13.6" height="12.2" rx="2" />
		<path d="M3.2 8.4h13.6M7 3.2v2.6M13 3.2v2.6" />
	{:else if nome === 'recinto'}
		<!-- pavilhão: telhado e porta -->
		<path d="M2.8 9 10 4l7.2 5" />
		<path d="M4.6 9.6v7.2h10.8V9.6" />
		<path d="M8.4 16.8v-4.2h3.2v4.2" />
	{:else if nome === 'local'}
		<path d="M10 17.5s5.3-5 5.3-9A5.3 5.3 0 0 0 4.7 8.5c0 4 5.3 9 5.3 9Z" />
		<circle cx="10" cy="8.4" r="1.9" />
	{:else if nome === 'arbitro'}
		<!-- apito -->
		<path d="M3 9.2h6.4l5.4-2.1v7l-5.4-2.1H3Z" />
		<path d="M5.6 12v2.6a1.9 1.9 0 0 0 3.8 0V12" />
	{:else if nome === 'faltas'}
		<!-- contagem -->
		<path d="M4.4 6h11.2M4.4 10h7.6M4.4 14h9.4" />
	{/if}
</svg>

<style>
	svg {
		flex: 0 0 auto;
		color: var(--suave);
	}
</style>
