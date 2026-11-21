<script lang="ts">
	/**
	 * O Pai Natal com uma prenda, desenhado à mão em SVG — sem imagem de fora, sem tipo de letra
	 * de fora (a política de privacidade promete zero), e com as cores fixas: é uma ilustração e
	 * não um ícone, e fica igual nos dois temas.
	 */
	let { tamanho = 64 }: { tamanho?: number } = $props();
</script>

<svg viewBox="0 0 80 64" width={tamanho * 1.25} height={tamanho} aria-hidden="true">
	<!-- o gorro -->
	<path d="M14 26 Q20 6 40 10 Q34 16 34 26 Z" fill="#d32f2f" />
	<circle cx="40" cy="10" r="3.4" fill="#fff" stroke="#e0e0e0" stroke-width="0.6" />
	<rect x="11" y="24" width="26" height="6" rx="3" fill="#fff" stroke="#e0e0e0" stroke-width="0.6" />
	<!-- a cara e a barba -->
	<circle cx="24" cy="35" r="7.5" fill="#f6c9a8" />
	<circle cx="21.5" cy="33.5" r="1" fill="#3e2723" />
	<circle cx="26.5" cy="33.5" r="1" fill="#3e2723" />
	<circle cx="24" cy="36.5" r="1.6" fill="#e57373" />
	<path d="M14 36 Q15 52 24 56 Q33 52 34 36 Q30 41 24 41 Q18 41 14 36 Z" fill="#fff"
		stroke="#e0e0e0" stroke-width="0.6" />
	<path d="M19.5 40 Q24 38.5 28.5 40" fill="none" stroke="#e0e0e0" stroke-width="1.2" stroke-linecap="round" />
	<!-- a prenda -->
	<rect x="46" y="38" width="24" height="20" rx="2" fill="#2e7d32" />
	<rect x="44" y="33" width="28" height="7" rx="2" fill="#388e3c" />
	<rect x="56" y="33" width="4" height="25" fill="#fbc02d" />
	<path d="M58 33 Q52 24 49 29 Q50 33 58 33 Q64 24 67 29 Q66 33 58 33" fill="none" stroke="#fbc02d"
		stroke-width="2.2" stroke-linejoin="round" />
</svg>

<style>
	svg { display: block; margin: 0 auto 0.5rem; }
</style>
