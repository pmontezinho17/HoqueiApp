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
	import { APP_NOME } from './sitio';
	import { VERSAO } from './versao';
	import { guia } from './guia.svelte';
	import { critica } from './critica.svelte';
	import { tema, TEMAS } from './tema.svelte';
	import { cor, CORES } from './cor.svelte';
	import { RECOLHER_FEEDBACK } from './feedback';
	import Icone from './Icone.svelte';
	import { partilhar, PODE_PARTILHAR_NATIVO } from './partilha';

	let {
		aberto = $bindable(false),
		/** a altura real do cabeçalho, para o menu cair logo abaixo dele */
		topo
	}: { aberto?: boolean; topo: number } = $props();

	let painel = $state<HTMLDivElement | null>(null);

	/**
	 * A partilha: folha nativa no telemóvel, cópia do endereço onde não há.
	 *
	 * O menu **não fecha** quando se copia — senão a confirmação desaparecia com ele e
	 * ninguém sabia se tinha resultado. Fecha quando a folha nativa abre, porque aí a
	 * confirmação é o próprio sistema.
	 */
	let copiado = $state(false);
	async function aoPartilhar() {
		const r = await partilhar();
		if (r === 'partilhado') return fechar();
		copiado = r === 'copiado';
		if (copiado) setTimeout(() => (copiado = false), 2500);
	}

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
			<Icone nome="guia" tamanho={18} />
			<span class="texto">
				<span class="rotulo">Ver o guia outra vez</span>
				<span class="ajuda">Os ecrãs e os gestos, passo a passo</span>
			</span>
		</button>

		{#if RECOLHER_FEEDBACK}
			<button class="linha" onclick={darOpiniao}>
				<Icone nome="opiniao" tamanho={18} />
				<span class="texto">
					<span class="rotulo">Dar uma opinião</span>
					<span class="ajuda">O que está mal, o que falta</span>
				</span>
			</button>
		{/if}

		<button class="linha" onclick={aoPartilhar}>
			<Icone nome="partilhar" tamanho={18} />
			<span class="texto">
				<span class="rotulo">Partilhar a aplicação</span>
				<span class="ajuda">{copiado ? 'Endereço copiado' : 'Mandar o OK4Sticks a alguém'}</span>
			</span>
		</button>

		<div class="risca"></div>

		<div class="aparencia">
			<span class="rotulo"><Icone nome="aparencia" tamanho={18} />Aparência</span>
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

		<div class="cores">
			<span class="rotulo"><Icone nome="cores" tamanho={18} />Cor</span>
			<div class="pastilhas" role="group" aria-label="Cor da aplicação">
				{#each CORES as c (c.valor)}
					<!-- A pastilha é a própria cor, e não um nome: escolher "Grená" de uma lista
					     de palavras obriga a imaginar; aqui vê-se. O nome fica no `aria-label`
					     para quem lê por voz, que é quem não vê a cor nenhuma. -->
					<button
						class="pastilha"
						class:activa={cor.escolha === c.valor}
						aria-pressed={cor.escolha === c.valor}
						aria-label={c.rotulo}
						title={c.rotulo}
						style="--amostra: {c.claro}; --amostra-escura: {c.escuro}"
						onclick={() => cor.escolher(c.valor)}
					></button>
				{/each}
			</div>
		</div>

		<div class="risca"></div>

		<a class="linha" href="/ajuda" onclick={fechar}>
			<Icone nome="ajuda" tamanho={18} />
			<span class="texto">
				<span class="rotulo">Perguntas frequentes</span>
				<span class="ajuda">O que se pergunta primeiro, respondido</span>
			</span>
		</a>
		<a class="linha" href="/mais" onclick={fechar}>
			<Icone nome="informacoes" tamanho={18} />
			<span class="texto">
				<span class="rotulo">Sobre a app e os dados</span>
				<span class="ajuda">A fonte, as contagens e a última actualização</span>
			</span>
		</a>
		<a class="linha" href="/privacidade" onclick={fechar}>
			<Icone nome="privacidade" tamanho={18} />
			<span class="texto">
				<span class="rotulo">Política de privacidade</span>
				<span class="ajuda">O que fica no teu telemóvel, e como pedir a remoção de um nome</span>
			</span>
		</a>

		<!--
			A versão, pedida pelo dono a 10/10/2026, e aqui por ser o sítio onde ele a procurou.
			Em letra pequena e sem rótulo: quem a procura sabe o que é um número de versão, e
			quem não a procura não precisa de saber que ela existe.
		-->
		<p class="versao">{APP_NOME} {VERSAO}</p>
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

	/* ícone à esquerda e o texto ao lado: o dono pediu-os a 10/10/2026 para "perceber logo
	   que tipo de informação é". Oito linhas de texto puro liam-se como uma lista de leis. */
	.linha {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: var(--e-3);
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
	.linha .texto { display: flex; flex-direction: column; align-items: flex-start; gap: 1px; }
	/* o `Icone` pinta-se de `--suave` por dentro; aqui queremos o mesmo tom do texto de ajuda,
	   que é o que o faz ler-se como etiqueta e não como botão */
	.linha :global(svg) { flex: 0 0 auto; }
	.aparencia .rotulo, .cores .rotulo { display: flex; align-items: center; gap: var(--e-3); }

	.cores { padding: var(--e-2) var(--e-3); display: flex; flex-direction: column;
		gap: var(--e-2); }
	.pastilhas { display: flex; gap: var(--e-2); flex-wrap: wrap; }
	/* 44 px de área de toque numa pastilha de 26: o alvo é o botão, a cor é o miolo. Sem
	   isto a escolha falhava-se com o polegar, que é como isto vai ser usado. */
	.pastilha {
		width: 44px; height: 44px; padding: 0; border: 0; background: none;
		display: grid; place-items: center; cursor: pointer; border-radius: 50%;
	}
	.pastilha::before {
		content: ''; width: 26px; height: 26px; border-radius: 50%;
		background: var(--amostra);
		box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.12);
	}
	/* No escuro a pastilha mostra a cor **do escuro**, que é a que a app vai usar. Mostrar a
	   do claro era pedir à pessoa que escolhesse por uma amostra que não é a que ela vai ver.
	   As duas condições cobrem o tema pelo sistema e o escolhido à mão, como o resto do CSS
	   de temas deste projecto. */
	@media (prefers-color-scheme: dark) {
		:global(html:not([data-tema='claro'])) .pastilha::before {
			background: var(--amostra-escura);
			box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.14);
		}
	}
	:global(html[data-tema='escuro']) .pastilha::before {
		background: var(--amostra-escura);
		box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.14);
	}
	/* o anel de escolhida é a cor do texto e não a da pastilha: sobre a própria cor
	   desaparecia, e é esse o único sítio onde ele tem de se ver */
	.pastilha.activa { box-shadow: inset 0 0 0 2px var(--texto); }
	.linha:active { background: var(--acento-fraco); }

	.versao {
		margin: var(--e-2) 0 0;
		padding: var(--e-2) var(--e-4) 0;
		font-size: 0.62rem;
		color: var(--suave);
		border-top: 1px solid var(--borda-fraca);
		text-align: right;
	}
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
