<script lang="ts">
	/**
	 * O menu do ⋮.
	 *
	 * Antes o ⋮ era um link directo para `/mais`, e essa página tinha cinco blocos dentro:
	 * ficha técnica dos dados, aviso de site não oficial, guia, resumo de privacidade e
	 * nomes de atletas. Eram três coisas de natureza diferente — uma preferência, uma ficha
	 * técnica e duas páginas legais — amontoadas num ecrã só.
	 *
	 * Agora o ⋮ abre isto, e cada coisa tem o seu sítio. Seis linhas em três grupos: o que
	 * se faz, o que se escolhe, e o que se lê.
	 *
	 * **A aparência escolhe-se aqui dentro, sem ecrã próprio**, por decisão do Pedro a
	 * 06/10/2026: são três opções e uma escolha imediata vale mais do que uma navegação.
	 *
	 * O que **não** entra aqui é a procura. Esconder navegação primária atrás de um menu
	 * corta a descoberta a metade — está medido em `docs/04-benchmarking.md`, e é por isso
	 * que a lupa continua a ser um ícone à vista.
	 */
	import { goto } from '$app/navigation';
	import { guia } from './guia.svelte';
	import { critica } from './critica.svelte';
	import { tema, TEMAS } from './tema.svelte';
	import { RECOLHER_FEEDBACK } from './feedback';

	let {
		aberto = $bindable(false),
		/** a altura real do cabeçalho, para o menu cair logo abaixo dele */
		topo
	}: { aberto?: boolean; topo: number } = $props();

	let painel = $state<HTMLDivElement | null>(null);

	/**
	 * Ao abrir, o foco entra no painel.
	 *
	 * Sem isto quem navega por teclado carrega no ⋮, o menu abre, e o próximo `Tab` vai para
	 * o conteúdo da página atrás do véu — a pessoa fica a navegar uma coisa que não vê.
	 */
	$effect(() => {
		if (aberto) painel?.focus();
	});

	function fechar() {
		aberto = false;
	}

	/**
	 * Voltar a ver o guia.
	 *
	 * Tem de navegar primeiro: os passos iluminam a página de equipa, a lista de jogos e a
	 * barra de baixo, e de dentro de um menu não há nada para iluminar.
	 */
	async function verGuia() {
		fechar();
		await goto('/');
		guia.comecar();
	}

	function darOpiniao() {
		fechar();
		critica.abrir();
	}
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && fechar()} />

{#if aberto}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div class="veu" onclick={fechar}></div>
	<!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
	<div
		class="painel"
		bind:this={painel}
		tabindex="-1"
		role="dialog"
		aria-modal="true"
		aria-label="Mais opções"
		style="--queda: {topo}px"
	>
		<button class="linha" onclick={verGuia}>
			<span class="rotulo">Ver o guia outra vez</span>
			<span class="ajuda">Os ecrãs e os gestos, passo a passo</span>
		</button>

		{#if RECOLHER_FEEDBACK}
			<button class="linha" onclick={darOpiniao}>
				<span class="rotulo">Dar uma opinião</span>
				<span class="ajuda">O que está mal, o que falta</span>
			</button>
		{/if}

		<div class="risca"></div>

		<div class="aparencia">
			<span class="rotulo">Aparência</span>
			<div class="escolhas" role="group" aria-label="Aparência">
				{#each TEMAS as t (t.valor)}
					<button
						class:activo={tema.escolha === t.valor}
						aria-pressed={tema.escolha === t.valor}
						onclick={() => tema.escolher(t.valor)}>{t.rotulo}</button
					>
				{/each}
			</div>
		</div>

		<div class="risca"></div>

		<a class="linha" href="/ajuda" onclick={fechar}>
			<span class="rotulo">Perguntas frequentes</span>
			<span class="ajuda">O que se pergunta primeiro, respondido</span>
		</a>
		<a class="linha" href="/mais" onclick={fechar}>
			<span class="rotulo">Sobre a app e os dados</span>
			<span class="ajuda">A fonte, as contagens e a última actualização</span>
		</a>
		<a class="linha" href="/privacidade" onclick={fechar}>
			<span class="rotulo">Política de privacidade</span>
			<span class="ajuda">O que fica no teu telemóvel, e como pedir a remoção de um nome</span>
		</a>
	</div>
{/if}

<style>
	.veu {
		position: fixed;
		inset: 0;
		/* acima da barra de navegação de baixo, que vive a 10 */
		z-index: 40;
		background: rgb(0 0 0 / 0.45);
	}
	/*
	  Encostado à direita e debaixo do ⋮, que é de onde sai — um menu que aparecesse ao meio
	  do ecrã não se liga ao botão que o abriu.
	*/
	.painel {
		position: fixed;
		z-index: 41;
		top: calc(var(--queda) + var(--e-1));
		right: var(--e-3);
		left: auto;
		width: min(20rem, calc(100vw - 2 * var(--e-3)));
		max-height: calc(100vh - var(--queda) - 52px - env(safe-area-inset-bottom) - var(--e-6));
		overflow-y: auto;
		overscroll-behavior: contain;
		padding: var(--e-2);
		border-radius: var(--raio-cartao);
		border: 1px solid var(--borda);
		background: var(--cartao);
		box-shadow: 0 10px 30px rgb(0 0 0 / 0.3);
	}
	.painel:focus { outline: none; }

	.linha {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 1px;
		width: 100%;
		min-height: 48px;
		padding: var(--e-2) var(--e-3);
		border: 0;
		border-radius: var(--raio);
		background: none;
		color: inherit;
		font: inherit;
		text-align: left;
		text-decoration: none;
		cursor: pointer;
	}
	.linha:active { background: var(--acento-fraco); }
	.rotulo { font-size: var(--t-base); color: var(--texto); }
	.ajuda { font-size: var(--t-micro); color: var(--suave); line-height: 1.3; }

	.risca { height: 1px; margin: var(--e-2) var(--e-3); background: var(--borda-fraca); }

	.aparencia { padding: var(--e-2) var(--e-3) var(--e-3); }
	.escolhas { display: flex; gap: var(--e-1); margin-top: var(--e-2); }
	.escolhas button {
		flex: 1;
		min-height: 36px;
		border-radius: var(--raio);
		border: 1px solid var(--borda);
		background: transparent;
		color: var(--suave);
		font: inherit;
		font-size: var(--t-micro);
		cursor: pointer;
	}
	.escolhas button.activo {
		border-color: var(--acento);
		background: var(--acento);
		color: var(--cartao);
		font-weight: 600;
	}
</style>
