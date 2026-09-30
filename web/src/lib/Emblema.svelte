<script lang="ts">
	// Os emblemas são WebP de ~2,3 KB servidos da nossa origem com cache imutável.
	// `loading=lazy` + dimensões fixas: só descarrega o que está à vista e não há salto
	// de layout quando cada imagem chega.
	let {
		equipa,
		src = null,
		tamanho = 22
	}: { equipa: string; src?: string | null; tamanho?: number } = $props();

	let falhou = $state(false);

	/** Iniciais como recuo: nem todas as equipas têm emblema na fonte. */
	const iniciais = $derived(
		equipa
			.split(/[\s/]+/)
			.filter((p) => p.length > 1 && !/^(FC|CD|AD|SC|GD|AE|HC|UD|SL|GDS|GRF|APAC|FSE|UF)$/i.test(p))
			.slice(0, 2)
			.map((p) => p[0])
			.join('') || equipa.slice(0, 2)
	);

	/** Cor estável por nome: a mesma equipa tem sempre a mesma cor. */
	const matiz = $derived(
		[...equipa].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7)
	);
</script>

{#if src && !falhou}
	<img
		{src} alt="" aria-hidden="true" loading="lazy" decoding="async"
		width={tamanho} height={tamanho} onerror={() => (falhou = true)}
		style={`width:${tamanho}px;height:${tamanho}px`}
	/>
{:else}
	<span
		class="iniciais" aria-hidden="true"
		style={`width:${tamanho}px;height:${tamanho}px;font-size:${tamanho * 0.4}px;
			background:hsl(${matiz} 45% 88%);color:hsl(${matiz} 55% 28%)`}
	>{iniciais}</span>
{/if}

<style>
	img { object-fit: contain; flex: 0 0 auto; }
	.iniciais {
		display: inline-flex; align-items: center; justify-content: center;
		border-radius: 50%; font-weight: 700; letter-spacing: -0.02em; flex: 0 0 auto;
	}
	@media (prefers-color-scheme: dark) {
		/* em fundo escuro as iniciais claras cegam; inverte-se a relação */
		.iniciais { filter: brightness(0.55) saturate(1.3); }
	}
</style>
