<script lang="ts">
	// Folha inferior: o padrão nativo para listas longas em telemóvel. Um <select> com 37
	// entradas obriga a ler tudo; aqui pesquisa-se e chega-se em dois toques.
	let {
		aberta = $bindable(false),
		titulo,
		children
	}: { aberta?: boolean; titulo: string; children: any } = $props();

	let dialogo = $state<HTMLDialogElement | null>(null);

	$effect(() => {
		if (!dialogo) return;
		if (aberta && !dialogo.open) dialogo.showModal();
		if (!aberta && dialogo.open) dialogo.close();
	});
</script>

<dialog bind:this={dialogo} onclose={() => (aberta = false)} aria-label={titulo}>
	<header>
		<h2>{titulo}</h2>
		<button onclick={() => (aberta = false)} aria-label="Fechar">✕</button>
	</header>
	<div class="corpo">{@render children()}</div>
</dialog>

<style>
	/* O browser esconde um <dialog> fechado com `display:none`. Declarar `display:flex`
	   no seletor solto anula isso e a folha fica sempre visível — por isso o layout
	   interno vive em `dialog[open]`. */
	dialog {
		width: 100%; max-width: 44rem; max-height: 85vh;
		margin: auto auto 0; padding: 0; border: 0;
		border-radius: 16px 16px 0 0;
		background: var(--fundo); color: var(--texto);
		overflow: hidden;
	}
	dialog[open] { display: flex; flex-direction: column; }
	dialog::backdrop { background: rgb(0 0 0 / 0.45); }
	dialog[open] { animation: subir 0.18s ease-out; }
	@keyframes subir { from { transform: translateY(12%); } to { transform: none; } }
	@media (prefers-reduced-motion: reduce) { dialog[open] { animation: none; } }

	header {
		display: flex; align-items: center; justify-content: space-between;
		padding: 0.9rem 1rem 0.6rem; border-bottom: 1px solid var(--borda);
	}
	h2 { margin: 0; font-size: 0.95rem; }
	header button {
		min-width: 44px; min-height: 44px; border: 0; background: none;
		color: var(--suave); font-size: 1rem; cursor: pointer;
	}
	.corpo { overflow-y: auto; padding: 0.6rem 1rem 1.4rem; -webkit-overflow-scrolling: touch; }
</style>
