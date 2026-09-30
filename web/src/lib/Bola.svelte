<script lang="ts">
	// A bola de hóquei em patins é lisa e escura — nada a ver com os pentágonos do ⚽.
	// Em SVG e não emoji por duas razões: o emoji muda de desenho conforme o sistema,
	// e uma bola escura precisa de aro para não desaparecer no tema escuro.
	let { tamanho = 14 }: { tamanho?: number } = $props();
</script>

<svg
	width={tamanho} height={tamanho} viewBox="0 0 16 16"
	role="img" aria-label="golo" class="bola"
>
	<circle cx="8" cy="8" r="6.6" class="corpo" />
	<!-- reflexo: é o que a faz ler como bola e não como ponto -->
	<path d="M5.3 4.9a4.4 4.4 0 0 1 3.1-1.3" class="brilho" />
</svg>

<style>
	.bola { display: inline-block; vertical-align: -0.15em; }
	.corpo { fill: #16181c; stroke: #3a3f48; stroke-width: 0.8; }
	.brilho { fill: none; stroke: #6e747e; stroke-width: 1.2; stroke-linecap: round; }
	@media (prefers-color-scheme: dark) {
		/* num fundo escuro uma bola preta sem aro claro desaparece */
		.corpo { fill: #0c0e11; stroke: #6b7280; stroke-width: 1; }
		.brilho { stroke: #aab1bb; }
	}
</style>
