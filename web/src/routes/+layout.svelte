<script lang="ts">
	import { goto } from '$app/navigation';
	import { page, navigating } from '$app/state';
	import Desatualizado from '$lib/Desatualizado.svelte';

	let { data, children } = $props();

	const emJogos = $derived(page.url.pathname === '/');
	const emTabelas = $derived(page.url.pathname.startsWith('/classificacoes'));
	const emQuadros = $derived(page.url.pathname.startsWith('/quadros'));
	const consulta = $derived(`?comp=${data.escolhida.id}`);

	function mudarCompeticao(e: Event) {
		const id = (e.target as HTMLSelectElement).value;
		goto(`${page.url.pathname}?comp=${id}`, { invalidateAll: true });
	}
</script>

{#if navigating.to}<div class="progresso" role="status" aria-label="A carregar"></div>{/if}

<header>
	<div class="topo">
		<a class="marca" href={`/${consulta}`}>Hóquei<span>em patins</span></a>
		<Desatualizado geradoEm={data.meta.generated_at} />
	</div>
	<select onchange={mudarCompeticao} value={String(data.escolhida.id)} aria-label="Competição">
		{#each data.indice.competicoes as c (c.id)}
			<option value={String(c.id)}>{c.categoria} · {c.nome}</option>
		{/each}
	</select>
	<nav aria-label="Secções">
		<a href={`/${consulta}`} aria-current={emJogos ? 'page' : undefined}>Jogos</a>
		<a href={`/classificacoes${consulta}`} aria-current={emTabelas ? 'page' : undefined}>Classificação</a>
		<a href={`/quadros${consulta}`} aria-current={emQuadros ? 'page' : undefined}>Quadros</a>
	</nav>
</header>

<main>{@render children()}</main>

<footer>
	<p>Dados da Associação de Patinagem de Lisboa. Este site não é oficial.</p>
	<p class="pequeno">Sem estatísticas individuais em escalões de formação.</p>
</footer>

<style>
	:global(:root) {
		--fundo: #f6f7f9; --cartao: #fff; --texto: #15181d; --suave: #6b7280;
		--borda: #e4e6ea; --acento: #0a7d54; --acento-fraco: #e6f4ee;
		--aviso: #92400e; --aviso-fundo: #fef3c7;
	}
	@media (prefers-color-scheme: dark) {
		:global(:root) {
			--fundo: #0f1115; --cartao: #181b21; --texto: #e8eaed; --suave: #9aa1ab;
			--borda: #272b33; --acento: #34d399; --acento-fraco: #123026;
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

	header {
		position: sticky; top: 0; z-index: 10;
		background: var(--fundo); border-bottom: 1px solid var(--borda);
		padding: 0.7rem 1rem 0; max-width: 44rem; margin: 0 auto;
	}
	.topo { display: flex; align-items: baseline; justify-content: space-between; gap: 0.75rem; }
	.marca { font-weight: 700; font-size: 1.05rem; text-decoration: none; }
	.marca span { font-weight: 400; color: var(--suave); margin-left: 0.35rem; font-size: 0.8rem; }
	select {
		width: 100%; margin-top: 0.6rem; padding: 0.55rem; font-size: 0.9rem;
		border-radius: 8px; border: 1px solid var(--borda);
		background: var(--cartao); color: inherit;
	}
	nav { display: flex; gap: 0.25rem; margin-top: 0.6rem; }
	nav a {
		flex: 1; text-align: center; padding: 0.6rem 0.25rem; min-height: 44px;
		font-size: 0.88rem; text-decoration: none; color: var(--suave);
		border-bottom: 2px solid transparent;
	}
	nav a[aria-current='page'] { color: var(--acento); border-bottom-color: var(--acento); font-weight: 600; }

	main { max-width: 44rem; margin: 0 auto; padding: 1rem; }
	footer {
		max-width: 44rem; margin: 0 auto; padding: 1.5rem 1rem 2.5rem;
		border-top: 1px solid var(--borda); color: var(--suave); font-size: 0.78rem;
	}
	footer p { margin: 0.2rem 0; }
	.pequeno { font-size: 0.72rem; }

	.progresso {
		position: fixed; inset: 0 0 auto 0; height: 3px; background: var(--acento);
		animation: correr 1s ease-in-out infinite; transform-origin: left; z-index: 20;
	}
	@keyframes correr { 0% { transform: scaleX(0); } 50% { transform: scaleX(0.7); } 100% { transform: scaleX(1); } }
</style>
