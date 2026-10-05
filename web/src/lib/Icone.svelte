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
	{:else if nome === 'jogos'}
		<!-- placar: duas equipas e um resultado -->
		<rect x="2.6" y="5.2" width="14.8" height="9.6" rx="2" />
		<path d="M10 7.4v5.2M5.6 10h1.8M12.6 10h1.8" />
	{:else if nome === 'clube'}
		<path d="M10 3.1l5.6 1.9v5.1c0 3-2.3 5.4-5.6 6.8-3.3-1.4-5.6-3.8-5.6-6.8V5Z" />
	{:else if nome === 'eventos'}
		<!-- Stick e bola. Comparei cinco desenhos a 22px, que é o tamanho a que isto vive:
		     o gancho fechado lia-se como uma vírgula, a lâmina recta ficava dura, e dois
		     sticks cruzados liam-se como um X de fechar. A lâmina curva é a que se parece
		     mesmo com um stick. -->
		<path d="M15.2 3 9.8 12.4c-1 1.8-2.6 2.9-4.9 3.3" />
		<circle cx="14.4" cy="16.4" r="1.6" fill="currentColor" stroke="none" />
	{:else if nome === 'tabela'}
		<!-- pódio: o 1º ao meio, como em qualquer classificação. A lista numerada que estava
		     aqui punha o 2 e o 3 em cima um do outro a 22px. -->
		<path d="M8 4.4h4v13H8z" />
		<path d="M3 9.2h5v8.2H3zM12 11.6h5v5.8h-5z" />
	{:else if nome === 'equipas'}
		<!-- duas pessoas: os convocados -->
		<circle cx="7.6" cy="7" r="2.6" />
		<path d="M3.2 16.4c0-2.4 2-4.2 4.4-4.2s4.4 1.8 4.4 4.2" />
		<path d="M13.4 5.1a2.6 2.6 0 0 1 0 5.1M14.4 12.5c1.5.5 2.5 1.9 2.5 3.9" />
	{:else if nome === 'informacoes'}
		<circle cx="10" cy="10" r="7.2" />
		<path d="M10 9.2v4.4" />
		<circle cx="10" cy="6.4" r="0.1" stroke-width="2" />
	{:else if nome === 'feedback'}
		<!-- balão de fala -->
		<path d="M17 11.4c0 2.5-2.1 4.5-4.7 4.5H9.8l-3.9 2.3.6-2.6A4.5 4.5 0 0 1 3 11.4V8.1c0-2.5 2.1-4.5 4.7-4.5h4.6c2.6 0 4.7 2 4.7 4.5Z" />
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
