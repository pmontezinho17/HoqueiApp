<script lang="ts">
	/**
	 * Um fio de luzinhas pendurado por baixo do cabeçalho, no Natal (`natal.svelte.ts`).
	 *
	 * **Duas camadas da mesma fiada, com as lâmpadas trocadas**, e cada uma acende e apaga ao
	 * contrário da outra: é o pisca-pisca sem mexer em lâmpada nenhuma, e sem JavaScript. Quem
	 * pediu menos movimento no sistema vê-as acesas e paradas.
	 *
	 * Decorativo de ponta a ponta: não se toca, não se lê, e não tapa nada — fica pendurado
	 * por cima da linha do cabeçalho, nos primeiros 12 px da página.
	 */
	const fio = (cores: string[]) => {
		const bolas = cores
			.map((c, i) => {
				const x = 20 + i * 40;
				const y = i % 2 ? 7 : 5;
				return `<rect x='${x - 1.5}' y='${y - 2.5}' width='3' height='2.5' rx='0.6' fill='%23555'/><ellipse cx='${x}' cy='${y + 3}' rx='3' ry='4.2' fill='${c}'/>`;
			})
			.join('');
		return `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='14'><path d='M0 2 Q20 7 40 3 T80 3 T120 3 T160 2' fill='none' stroke='%23666' stroke-width='0.8'/>${bolas}</svg>")`;
	};
	const A = fio(['%23e53935', '%23fbc02d', '%2343a047', '%231e88e5']);
	const B = fio(['%23fbc02d', '%2343a047', '%231e88e5', '%23e53935']);
</script>

<div class="luzinhas" aria-hidden="true">
	<span style="background-image: {A}"></span>
	<span class="b" style="background-image: {B}"></span>
</div>

<style>
	.luzinhas { position: absolute; left: 0; right: 0; bottom: -13px; height: 14px;
		pointer-events: none; z-index: 1; }
	span { position: absolute; inset: 0; background-repeat: repeat-x; background-size: 160px 14px;
		animation: piscar 2.4s ease-in-out infinite; }
	.b { animation-delay: -1.2s; }
	@keyframes piscar { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
	@media (prefers-reduced-motion: reduce) { span { animation: none; } .b { opacity: 0.6; } }
</style>
