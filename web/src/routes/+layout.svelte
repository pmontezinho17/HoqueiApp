<script lang="ts">
	import { page, navigating } from '$app/state';
	import Desatualizado from '$lib/Desatualizado.svelte';
	import { favoritos } from '$lib/favoritos.svelte';

	let { data, children } = $props();

	// Três destinos primários, sempre visíveis. O secundário vive nos ícones do cabeçalho —
	// medido: esconder navegação primária num menu corta a descoberta a metade
	// (ver docs/04-benchmarking.md).
	const SECCOES = [
		{ href: '/', rotulo: 'Jogos' },
		{ href: '/clube', rotulo: 'O Meu Clube' },
		{ href: '/competicoes', rotulo: 'Competições' }
	];
	const activa = (href: string) =>
		href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);
</script>

{#if navigating.to}<div class="progresso" role="status" aria-label="A carregar"></div>{/if}

<header>
	<div class="topo">
		<a class="marca" href="/">Hóquei<span>em patins</span></a>
		<div class="acoes">
			<Desatualizado geradoEm={data.meta.generated_at} />
			<a class="icone" href="/procurar" aria-label="Procurar equipa">
				<svg viewBox="0 0 20 20" width="19" height="19" aria-hidden="true">
					<circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" stroke-width="1.8" />
					<path d="M12.8 12.8 17 17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
				</svg>
			</a>
			<a class="icone" href="/mais" aria-label="Mais">
				<svg viewBox="0 0 20 20" width="19" height="19" aria-hidden="true">
					<circle cx="10" cy="4" r="1.7" fill="currentColor" />
					<circle cx="10" cy="10" r="1.7" fill="currentColor" />
					<circle cx="10" cy="16" r="1.7" fill="currentColor" />
				</svg>
			</a>
		</div>
	</div>
	<nav aria-label="Secções">
		{#each SECCOES as s (s.href)}
			<a href={s.href} aria-current={activa(s.href) ? 'page' : undefined}>
				{s.rotulo}{#if s.href === '/clube' && favoritos.lista.length}<span class="conta">{favoritos.lista.length}</span>{/if}
			</a>
		{/each}
	</nav>
</header>

<main>{@render children()}</main>

<style>
	:global(:root) {
		--fundo: #f6f7f9; --cartao: #fff; --texto: #15181d; --suave: #6b7280;
		--borda: #e4e6ea; --acento: #0a7d54; --acento-fraco: #e8f4ef;
		--aviso: #92400e; --aviso-fundo: #fef3c7;
	}
	@media (prefers-color-scheme: dark) {
		:global(:root) {
			--fundo: #0f1115; --cartao: #181b21; --texto: #e8eaed; --suave: #9aa1ab;
			--borda: #272b33; --acento: #34d399; --acento-fraco: #12271f;
			--aviso: #fcd34d; --aviso-fundo: #3a2e0b;
		}
	}
	:global(*) { box-sizing: border-box; }
	:global(body) {
		margin: 0; background: var(--fundo); color: var(--texto);
		font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
		-webkit-text-size-adjust: 100%;
	}
	:global(a) { color: inherit; }

	/* cromado compacto: 178px antes do 1º jogo era 22% do ecrã (ver benchmarking) */
	header {
		position: sticky; top: 0; z-index: 10; background: var(--fundo);
		border-bottom: 1px solid var(--borda);
		max-width: 44rem; margin: 0 auto; padding: 0.5rem 0.9rem 0;
	}
	.topo { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
	.marca { font-weight: 700; font-size: 0.98rem; text-decoration: none; }
	.marca span { font-weight: 400; color: var(--suave); margin-left: 0.3rem; font-size: 0.72rem; }
	.acoes { display: flex; align-items: center; gap: 0.15rem; }
	.icone { display: inline-flex; align-items: center; justify-content: center;
		width: 40px; height: 40px; color: var(--suave); text-decoration: none; }
	.icone:hover, .icone:focus-visible { color: var(--acento); outline: none; }

	nav { display: flex; gap: 0.1rem; }
	nav a {
		flex: 1; text-align: center; padding: 0.55rem 0.2rem; min-height: 42px;
		font-size: 0.82rem; text-decoration: none; color: var(--suave);
		border-bottom: 2px solid transparent; white-space: nowrap;
	}
	nav a[aria-current='page'] { color: var(--acento); border-bottom-color: var(--acento); font-weight: 600; }
	.conta { margin-left: 0.25rem; padding: 0.02rem 0.32rem; border-radius: 999px;
		background: var(--acento); color: var(--cartao); font-size: 0.64rem; }

	main { max-width: 44rem; margin: 0 auto; padding: 0.7rem 0.9rem 2.5rem; }

	.progresso {
		position: fixed; inset: 0 0 auto 0; height: 3px; background: var(--acento);
		animation: correr 1s ease-in-out infinite; transform-origin: left; z-index: 20;
	}
	@keyframes correr { 0% { transform: scaleX(0); } 50% { transform: scaleX(0.7); } 100% { transform: scaleX(1); } }
	@media (prefers-reduced-motion: reduce) { .progresso { animation: none; } }
</style>
