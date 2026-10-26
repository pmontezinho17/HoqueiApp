<script lang="ts">
	/**
	 * A caixa do "o que mudou", depois de uma actualização.
	 *
	 * **Aparece uma vez por versão e só a quem já usava a app** — a regra e a razão estão em
	 * `novidades.svelte.ts`. Pedida pelo dono a 10/10/2026, no mesmo pedido em que disse que
	 * estava saturado do aviso de actualização: as duas coisas andam juntas, porque o aviso
	 * deixou de aparecer a cada publicação e esta caixa é o que passa a dizer quando valeu a
	 * pena.
	 *
	 * O nome é `CaixaNovidades` e não `Novidades` porque o módulo de estado ao lado chama-se
	 * `novidades.svelte.ts`, pela convenção deste projecto, e os dois só diferiam na
	 * capitalização — o que num sistema de ficheiros que a ignora é o mesmo ficheiro.
	 *
	 * **Em baixo e não ao centro.** Não é um pedido de decisão nem um erro — é uma nota. Uma
	 * caixa ao centro com um véu por trás pára o que a pessoa ia fazer; esta deixa a lista de
	 * jogos à vista e fecha-se com um toque.
	 */
	import { novidades, partesDoTexto } from './novidades.svelte';
	import { RECOLHER_FEEDBACK } from './feedback';
	import { dataCurta } from './formato';

	// um só objecto para toda a app, e não uma instância deste componente: é o que permite ao
	// menu reabrir esta caixa. Ver o cabeçalho do `novidades.svelte.ts`.
	const n = novidades;
	// no arranque e só no cliente: o `localStorage` não existe durante o build
	$effect(() => n.arrancar());
</script>

<!-- o negrito dentro do texto de um ponto — ver `partesDoTexto` -->
{#snippet texto(t: string)}
	{#each partesDoTexto(t) as parte, i (i)}{#if parte.negrito}<b>{parte.texto}</b>{:else}{parte.texto}{/if}{/each}
{/snippet}

{#if n.aberta}
	<!-- `role="status"` e não `dialog`: não há nada a decidir aqui, e um diálogo obrigaria a
	     prender o foco dentro dele para ser honesto com quem navega por teclado -->
	<div class="caixa" class:comBolha={RECOLHER_FEEDBACK} role="status">
		<div class="cabeca">
			<h2>{n.modo === 'historico' ? 'O que há de novo' : 'O que mudou'}</h2>
			<button type="button" onclick={() => n.fechar()} aria-label="Fechar">✕</button>
		</div>
		{#if n.modo === 'historico'}
			<!--
			  **O histórico: tudo, por versão, e só os títulos.** Pedido do dono a 17/10/2026 —
			  *"colocar todas as alterações que foram feitas, mas mais resumidas, caso contrário
			  fica um texto gigantesco"*. Cinco versões com o texto todo passam das quarenta
			  linhas.

			  O resumo não foi preciso escrevê-lo: o `titulo` de cada ponto já é curto por
			  desenho, com um teste que o mantém assim. O texto fica num `<details>`, a um toque
			  — que é também o que faz isto funcionar para quem lê por voz, porque o `<summary>`
			  é um botão e anuncia-se como tal.
			-->
			{#each n.lista as v (v.versao)}
				<h3 class="versao">
					{v.versao}<span class="data">{dataCurta(v.data)}</span>
				</h3>
				<ul class="resumida">
					{#each v.pontos as p (p.titulo)}
						<li>
							<details>
								<summary>{p.titulo}</summary>
								<p>{@render texto(p.texto)}</p>
							</details>
						</li>
					{/each}
				</ul>
			{/each}
		{:else}
			<!-- Cabeçalhos a sério e não parágrafos em maiúsculas: quem lê por voz salta de
			     cabeçalho em cabeçalho, e numa lista de dez pontos é assim que se chega ao grupo
			     que interessa sem ouvir os outros. Ver o `GRUPOS` para a razão de serem três. -->
			{#each n.grupos as g (g.rotulo)}
				<h3>{g.rotulo}</h3>
				<ul>
					{#each g.pontos as p (p.titulo)}
						<li><strong>{p.titulo}</strong>{@render texto(p.texto)}</li>
					{/each}
				</ul>
			{/each}
		{/if}
	</div>
{/if}

<style>
	.caixa {
		position: fixed;
		/* acima da barra de navegação de baixo, que vive a 10 */
		z-index: 20;
		left: var(--e-4);
		right: var(--e-4);
		/* folga para a barra de baixo e para o recorte do telemóvel */
		--fundo: calc(52px + env(safe-area-inset-bottom) + var(--e-3));
		bottom: var(--fundo);
		max-width: 30rem;
		margin-inline: auto;
		/* **A caixa tem de caber, e com nove pontos não cabia.** Ancorada em baixo e sem tecto,
		   ela crescia para cima até sair do ecrã — e medido a 375×812 com a lista da 1.1, o
		   último ponto ficava cortado e sem forma de chegar lá. Passou a ser um defeito a sério
		   no dia em que o menu a deixou reabrir: até aí só a via quem acabava de actualizar, e
		   uma vez. O `4.5rem` é a folga do cabeçalho, para a caixa nunca passar por baixo dele. */
		max-height: calc(100vh - var(--fundo) - 4.5rem);
		overflow-y: auto;
		/* sem isto, chegar ao fim da lista continuava a rolar a página atrás da caixa */
		overscroll-behavior: contain;
		padding: var(--e-4);
		background: var(--cartao);
		border: 1px solid var(--borda);
		border-radius: var(--raio-cartao);
		box-shadow: 0 6px 24px rgb(0 0 0 / 0.18);
	}
	/* colado ao topo da caixa: numa lista que rola, o botão de fechar tem de continuar à mão */
	.cabeca { display: flex; align-items: center; justify-content: space-between; gap: var(--e-3);
		position: sticky; top: calc(var(--e-4) * -1); background: var(--cartao);
		padding: var(--e-4) 0 var(--e-2); margin-top: calc(var(--e-4) * -1); }
	.cabeca h2 { margin: 0; font-size: 0.82rem; }
	/* o rótulo do grupo: a mesma linguagem dos cabeçalhos de secção da app — pequeno, em
	   maiúsculas e em cor suave, para separar sem competir com os títulos dos pontos */
	h3 {
		margin: var(--e-3) 0 0;
		font-size: 0.64rem;
		font-weight: 600;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--suave);
	}
	/* o primeiro grupo encosta ao cabeçalho, que já traz o seu próprio espaço por baixo */
	h3:first-of-type { margin-top: 0; }
	.cabeca button {
		min-width: 32px; min-height: 32px; padding: 0;
		font-size: 0.9rem; line-height: 1; color: var(--suave);
		background: none; border: 0; cursor: pointer;
	}
	ul { margin: var(--e-2) 0 0; padding-left: 1.1rem; }
	li b { color: var(--texto); font-weight: 600; }
	li { font-size: 0.76rem; line-height: 1.5; color: var(--texto-2); margin-bottom: var(--e-2); }
	/* **O chavão em linha própria.** É a âncora que deixa percorrer a lista aos saltos em vez
	   de a ler toda — pedido pelo dono a 12/10/2026. A primeira versão punha-o em linha com a
	   descrição e não resultou: a 375px lia-se "...é o Mérito da Formação É o que o regulamento
	   manda", uma frase corrida sem fronteira visível, que é exactamente o que isto veio
	   resolver. Em `block` o olho tem onde parar. */
	/* **O título maior do que o texto**, a pedido do dono a 26/10/2026 — *"letras maiores e
	   outras menores"*. Os dois estavam no mesmo 0,76rem e o título só se distinguia pelo
	   negrito; agora é a manchete, e o texto fica no tamanho que já tinha, porque abaixo disso
	   deixa de se ler num telemóvel. */
	li strong { display: block; color: var(--texto); font-weight: 600; font-size: 0.92rem; line-height: 1.35; margin-bottom: 2px; }

	/* ── O histórico, do menu ──────────────────────────────────────────────────────────────
	   Mais compacto do que a folha automática de propósito: aqui a pergunta é "o que já mudou
	   nesta app?" e a resposta é uma lista para percorrer, não um texto para ler. */
	h3.versao {
		display: flex; align-items: baseline; gap: var(--e-2);
		margin: var(--e-3) 0 var(--e-1);
		font-size: var(--t-micro); color: var(--acento); text-transform: none; letter-spacing: 0;
	}
	h3.versao .data { color: var(--suave); font-weight: 400; }
	/* sem o ponto da lista: o triângulo do `<details>` já é o marcador desta linha */
	ul.resumida { margin: 0; list-style: none; padding-left: 0; }
	ul.resumida li { margin-bottom: 2px; }
	/* **Sem `display: flex` no `<summary>`.** Foi a primeira tentativa e o Chrome esconde o
	   triângulo de abertura quando se lhe muda o `display` — resultado: uma lista de títulos
	   que parecem texto e não dão sinal nenhum de que se abrem. Apanhado no browser. O alvo de
	   toque faz-se com `padding`, que não mexe no marcador. */
	ul.resumida summary {
		cursor: pointer; color: var(--texto); font-weight: 600; font-size: 0.86rem;
		padding: 6px 0; /* ~32px de alvo com a linha de texto, para se tocar num telemóvel */
	}
	ul.resumida summary::marker { color: var(--acento); }
	ul.resumida summary:hover { color: var(--acento); }
	ul.resumida details p { margin: 0 0 var(--e-2); color: var(--texto-2); }
	li:last-child { margin-bottom: 0; }
	/* **A bolha de opinião tapava o último ponto.** As duas vivem no `z-index: 20` e no mesmo
	   canto, e a bolha é desenhada depois, logo ganha — medido a 375×812 com a lista da 1.1.
	   O `main` já reserva 60px para o mesmo problema; aqui a caixa sobe acima dela, que não
	   desperdiça espaço por dentro como um `padding` faria. */
	.caixa.comBolha { --fundo: calc(52px + env(safe-area-inset-bottom) + var(--e-4) + 60px); }
</style>
