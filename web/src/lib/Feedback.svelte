<script lang="ts">
	/**
	 * A caixa "O que está mal", que envia a sugestão para nós.
	 *
	 * **Até 13/10/2026 isto era um `mailto:`**, e o cabeçalho defendia essa escolha com duas
	 * razões: *"não há servidor nem recolha"*, e *"não vale a pena para uma funcionalidade que
	 * sai daqui a umas semanas"*. O dono mudou os dois termos dessa conta — pediu que a
	 * sugestão virasse registo no GitHub sozinha, e com isso o botão deixou de ser temporário.
	 * Fica aqui o que a escolha antiga protegia, porque o que a substitui tem de o devolver de
	 * outra forma: **a pessoa tem de saber, antes de escrever, para onde é que aquilo vai.**
	 *
	 * Agora grava na nossa base de dados — ver `functions/sugerir.js` — e um processo diário
	 * arquiva-a num repositório **privado**. O texto não vai para lado nenhum público.
	 *
	 * **E a pergunta é a outra via, desde 26/10/2026.** Uma sugestão não precisa de resposta,
	 * precisa de ser registada; uma dúvida precisa de resposta. O email estava aqui como uma
	 * ligação na letra mais pequena do painel, e o dono continuava a receber dúvidas pela caixa
	 * — para onde não há como responder. Agora são dois separadores no topo e o porquê de a
	 * pergunta ir pelo email da pessoa está no `pergunta.ts`. O `mailto:` da sugestão continua
	 * como segunda via para quando o envio falhar.
	 *
	 * O ecrã onde a pessoa está vai junto, porque uma crítica sem saber onde aconteceu
	 * obriga a uma segunda troca de mensagens. Vai escrito à vista no corpo, e não
	 * escondido: quem envia vê tudo o que envia.
	 */
	import Icone from './Icone.svelte';
	import { page } from '$app/state';
	import { CONTACTO } from './contacto';
	import { critica } from './critica.svelte';
	import { VERSAO } from './versao';
	import { linkDeEmail, type Via } from './pergunta';
	import { MAXIMO } from '../../functions/sugerir.js';
	import { balaoEncostado } from './balao';

	/** Encostado à margem depois de rolar, para não tapar resultados — ver `balao.ts`. */
	let encostado = $state(false);

	let texto = $state('');
	/**
	 * O texto é um só para as duas vias, de propósito: quem escreveu uma dúvida no separador
	 * da sugestão e só depois deu pelo outro não tem de a escrever outra vez.
	 */
	let via = $state<Via>('sugestao');
	let copiado = $state(false);
	let caixa = $state<HTMLTextAreaElement | null>(null);

	const ecra = $derived(`${page.url.pathname}${page.url.search}`);
	const contexto = $derived(`ecrã: ${ecra} · versão: ${VERSAO}`);
	const corpo = $derived(`${texto}\n\n—\n${contexto}`);
	const link = $derived(linkDeEmail(via, texto, contexto));

	/**
	 * O foco tem de ir para a caixa, senão quem usa teclado abre e fica sem saber onde está.
	 *
	 * Está num efeito e não no `abrir()` porque o painel passou a abrir de dois sítios — a
	 * bolha e o menu do ☰ — e o do menu não passa por aqui.
	 */
	$effect(() => {
		if (!critica.aberto) return;
		copiado = false;
		// Cinto e suspensórios: todos os fechos passam pelo `fecharEReiniciar`, mas se um dia
		// algum deixar de passar, o que se via ao abrir era a confirmação do envio anterior.
		estado = 'parado';
		requestAnimationFrame(() => caixa?.focus());
	});

	async function copiar() {
		try {
			await navigator.clipboard.writeText(corpo);
			copiado = true;
		} catch {
			copiado = false;
		}
	}

	/**
	 * Depois de enviar, a caixa fica vazia — e isso é para continuar assim.
	 *
	 * Antes não ficava: o painel fechava e o texto continuava lá, por isso quem voltasse a
	 * abrir encontrava a crítica anterior à sua espera — e ou a apagava à mão, ou escrevia a
	 * segunda a seguir à primeira e mandava as duas. A limpeza vive no `enviar()`, e só depois
	 * de a resposta vir bem.
	 *
	 * Fechar pelo × ou pelo véu **não** limpa: aí o rascunho sobrevive, que é o que se quer de
	 * quem fechou sem querer. É também por isso que o `fecharEReiniciar` mexe no `estado` e
	 * não no `texto`.
	 */

	/**
	 * O estado do envio. `falhou` não é um beco: é o que faz aparecer o caminho do email,
	 * para uma sugestão nunca se perder por a nossa base de dados estar em baixo.
	 *
	 * ## Porque é que o `enviado` ficou como está, e não se fecha sozinho
	 *
	 * Havia confirmação — uma linha de `--t-micro` por baixo da caixa de texto — e o painel
	 * fechava-se 1,6 s depois. **Não chegava.** A 13/10/2026 o dono mandou duas sugestões do
	 * site de testes, as duas chegaram à base de dados, e o que ele escreveu a seguir foi:
	 * *"depois de carregar no enviar podia estar uma mensagem de mensagem enviada"*. Ou seja,
	 * enviou duas vezes sem ver nenhuma das confirmações que lá estavam.
	 *
	 * Três coisas conspiravam, e conta-se o que cada uma fazia porque a correcção é a soma:
	 *
	 *   1. a mensagem era a letra mais pequena do painel, por baixo de tudo o resto;
	 *   2. 1,6 s é menos do que o tempo de reparar que algo mudou **e** ler a frase — e o olho
	 *      de quem acabou de carregar está no botão, que nesse instante desaparece;
	 *   3. ao fechar, não ficava rasto nenhum. Quem piscou os olhos perdeu a única prova.
	 *
	 * Agora o painel **passa a ser** a confirmação: o formulário sai, entra um visto grande com
	 * duas linhas, e **fica até a pessoa fechar**. Sem relógio nenhum. Uma caixa que só se usa
	 * uma vez de cada vez pode dar-se ao luxo de esperar pela pessoa em vez de o contrário, e
	 * um fecho automático só serve para poupar um toque a quem já conseguiu o que queria.
	 */
	let estado = $state<'parado' | 'a-enviar' | 'enviado' | 'falhou'>('parado');

	/** Fecha e volta ao princípio, para a próxima abertura não encontrar a confirmação velha. */
	function fecharEReiniciar() {
		critica.fechar();
		estado = 'parado';
	}

	async function enviar() {
		if (!texto.trim() || estado === 'a-enviar') return;
		estado = 'a-enviar';
		try {
			const r = await fetch('/sugerir', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				cache: 'no-store',
				// `ok4` é a armadilha anti-robô do `sugerir.js`: vai sempre vazio
				body: JSON.stringify({ texto: texto.trim(), ecra, versao: VERSAO, ok4: '' })
			});
			if (!r.ok) throw new Error(String(r.status));
			estado = 'enviado';
			texto = '';
		} catch {
			estado = 'falhou';
		}
	}
</script>

<svelte:window
	onkeydown={(e) => e.key === 'Escape' && fecharEReiniciar()}
	onscroll={() => (encostado = balaoEncostado(window.scrollY))}
/>

{#if !critica.aberto}
	<button
		class="bolha"
		class:encostado
		data-guia="feedback"
		onclick={() => critica.abrir()}
		aria-label="Dar uma opinião sobre a aplicação"
	>
		<Icone nome="feedback" tamanho={22} />
	</button>
{:else}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div class="veu" onclick={fecharEReiniciar}></div>
	<div class="painel" role="dialog" aria-label="Dar uma opinião" aria-modal="true">
		<div class="cabeca">
			<strong
				>{estado === 'enviado'
					? 'Mensagem enviada'
					: via === 'sugestao'
						? 'O que está mal?'
						: 'Uma pergunta'}</strong
			>
			<button class="fechar" onclick={fecharEReiniciar} aria-label="Fechar">×</button>
		</div>
		{#if estado === 'enviado'}
			<!--
			  O painel **passa a ser** a confirmação: o formulário sai todo. Antes a mensagem era
			  uma linha de letra mínima por baixo da caixa de texto ainda cheia de campos, e o
			  dono mandou duas sugestões a 13/10/2026 sem ver nenhuma das duas confirmações.

			  `role="status"` para quem ouve a página: o texto é anunciado sem roubar o foco.
			-->
			<div class="recebido" role="status">
				<Icone nome="visto" tamanho={40} />
				<p class="recebido-titulo">Recebido, obrigado.</p>
				<p class="recebido-texto">
					Vamos lê-la. Não é preciso enviar outra vez — se quiseres acrescentar alguma
					coisa, abre a caixa de novo.
				</p>
				<button class="fechar-grande" onclick={fecharEReiniciar}>Fechar</button>
			</div>
		{:else}
			<!--
			  **Dois separadores e não duas caixas.** O ecrã é o mesmo — escrever um texto — e o que
			  muda é para onde ele vai. Cada um diz isso na primeira linha, antes de se escrever,
			  que é a regra desta caixa desde que deixou de ser um `mailto:`.
			-->
			<div class="vias" role="tablist" aria-label="O que queres enviar">
				<button
					role="tab"
					aria-selected={via === 'sugestao'}
					class:activa={via === 'sugestao'}
					onclick={() => (via = 'sugestao')}>Sugestão</button
				>
				<button
					role="tab"
					aria-selected={via === 'pergunta'}
					class:activa={via === 'pergunta'}
					onclick={() => (via = 'pergunta')}>Pergunta</button
				>
			</div>
			<p class="ajuda">
				{#if via === 'sugestao'}
					Diz o que te incomodou ou o que falta. Fica registado para o corrigirmos, mas não
					sabemos quem és — por isso não te podemos responder.
				{:else}
					Tens uma dúvida? Abrimos o teu email com ela já escrita, e respondemos para o
					endereço de onde a enviares.
				{/if}
			</p>
			<textarea
				bind:this={caixa}
				bind:value={texto}
				rows="5"
				maxlength={MAXIMO}
				placeholder={via === 'sugestao'
					? 'Por exemplo: no jogo dos sub-15 os nomes aparecem cortados…'
					: 'Por exemplo: porque é que a minha equipa não aparece na classificação?'}
			></textarea>
			<p class="junto">Vai junto: {contexto}</p>
			<div class="accoes">
				<button class="copiar" onclick={copiar} disabled={!texto.trim()}>
					{copiado ? 'copiado' : 'copiar'}
				</button>
				{#if via === 'pergunta'}
					<!-- Um `<a>` e não um botão com `fetch`: aqui não há envio nosso, há uma ligação
					     que o telemóvel entrega ao programa de email, como entrega qualquer outra. -->
					<a class="enviar" href={link}>Abrir o email</a>
				{:else}
					<button
						class="enviar"
						class:inactivo={!texto.trim() || estado === 'a-enviar'}
						disabled={!texto.trim() || estado === 'a-enviar'}
						onclick={enviar}>{estado === 'a-enviar' ? 'a enviar…' : 'Enviar'}</button
					>
				{/if}
			</div>
			{#if via === 'pergunta'}
				<p class="nota">
					Não passa pela nossa base de dados: vai do teu email para o nosso. Se o email não
					abrir, escreve para <strong>{CONTACTO}</strong> — o botão copiar leva o texto.
				</p>
			{:else if estado === 'falhou'}
				<!-- **A segunda via.** Se o envio falhar, a sugestão não se perde: abre-se o email
				     com o texto já escrito, que é exactamente o que esta caixa fazia antes. -->
				<p class="nota falhou">
					Não deu para enviar daqui.
					<a href={link}>Manda por email</a> — já vai escrito.
				</p>
			{:else}
				<p class="nota">
					Guardamos o que escreveres, com o ecrã e a versão, para o podermos corrigir. Não
					guardamos quem és. Se queres resposta,
					<button class="ligacao" onclick={() => (via = 'pergunta')}>faz uma pergunta</button>.
				</p>
			{/if}
		{/if}
	</div>
{/if}

<style>
	/* acima da barra de navegação, com a área segura do iPhone contada */
	.bolha {
		position: fixed;
		right: var(--e-4);
		/* `--acima-da-barra`: um ecrã com barra de acção fixa no fundo declara ali a altura
		   dela e a bolha sobe. Sem isso vale zero e fica onde sempre esteve. */
		bottom: calc(52px + env(safe-area-inset-bottom) + var(--acima-da-barra, 0px) + var(--e-4));
		z-index: 20;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		border-radius: 50%;
		border: 1px solid var(--acento);
		background: var(--acento);
		color: var(--cartao);
		cursor: pointer;
		box-shadow: 0 2px 10px rgb(0 0 0 / 0.18);
	}
	.bolha :global(svg) { color: var(--cartao); }
	/* **Encostado: só uma ponta de 12px à vista, na margem direita.** O resto sai do ecrã, e
	   com ele a área de toque — por isso o que fica por baixo do sítio onde o balão estava
	   volta a poder ler-se e a poder tocar-se. O deslocamento é a largura do balão mais a
	   margem, menos a ponta: escrito com `46px` à mão ficavam 14px à vista, porque a margem não
	   era a que eu supus — medido a 375×812. O ícone fica do lado de fora e não faz falta: a
	   ponta verde é o sinal. Não cria scroll horizontal: medido, 375px de largura com ele
	   encostado.

	   **12px e não 18px, porque a margem da página tem 14.** Medido a 375×812: os resultados
	   acabam aos 357,6px e o cartão aos 360,6px. Com 18px a ponta ainda cortava o algarismo da
	   direita — a queixa outra vez, só que mais pequena. Com 12 cabe inteira na margem. */
	.bolha {
		transition: transform 0.2s ease, opacity 0.2s ease;
	}
	.bolha.encostado {
		transform: translateX(calc(100% + var(--e-4) - 12px));
		opacity: 0.85;
	}
	@media (prefers-reduced-motion: reduce) {
		.bolha { transition: none; }
	}

	.veu {
		position: fixed;
		inset: 0;
		z-index: 20;
		background: rgb(0 0 0 / 0.35);
	}
	.painel {
		position: fixed;
		z-index: 21;
		right: var(--e-3);
		left: var(--e-3);
		bottom: calc(52px + env(safe-area-inset-bottom) + var(--e-3));
		max-width: 26rem;
		margin-left: auto;
		padding: var(--e-4);
		border-radius: var(--raio-cartao);
		border: 1px solid var(--borda);
		background: var(--cartao);
		box-shadow: 0 6px 24px rgb(0 0 0 / 0.22);
	}
	.cabeca {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--e-3);
		font-size: var(--t-base);
	}
	.fechar {
		border: 0;
		background: none;
		cursor: pointer;
		color: var(--suave);
		font-size: var(--t-titulo);
		line-height: 1;
		padding: 0 var(--e-2);
		min-height: 36px;
	}
	.ajuda {
		margin: var(--e-2) 0 var(--e-3);
		font-size: var(--t-pequeno);
		color: var(--texto-2);
		line-height: 1.45;
	}
	textarea {
		width: 100%;
		padding: var(--e-3);
		border-radius: var(--raio);
		border: 1px solid var(--borda);
		background: var(--fundo);
		color: var(--texto);
		/* 16px: abaixo disso o Safari do iPhone amplia a página inteira ao focar o campo */
		font: inherit;
		font-size: max(16px, 1rem);
		resize: vertical;
	}
	.junto {
		margin: var(--e-2) 0 var(--e-3);
		font-size: var(--t-micro);
		color: var(--suave);
		word-break: break-word;
	}
	/* Os separadores no mesmo desenho dos controlos da lista de jogos: uma pílula com duas
	   metades, a escolhida a cheio. */
	.vias {
		display: flex;
		margin: var(--e-3) 0 0;
		border: 1px solid var(--borda);
		border-radius: var(--raio-pilula);
		overflow: hidden;
	}
	.vias button {
		flex: 1;
		min-height: 40px;
		border: 0;
		background: var(--cartao);
		color: var(--texto-2);
		font: inherit;
		font-size: var(--t-pequeno);
		cursor: pointer;
	}
	.vias button.activa {
		background: var(--acento);
		color: var(--cartao);
		font-weight: 600;
	}
	.ligacao {
		border: 0;
		padding: 0;
		background: none;
		font: inherit;
		color: inherit;
		text-decoration: underline;
		cursor: pointer;
	}
	.accoes { display: flex; gap: var(--e-2); }
	.accoes > * {
		flex: 1;
		min-height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--raio);
		font-size: var(--t-base);
		cursor: pointer;
		text-decoration: none;
	}
	.copiar {
		border: 1px solid var(--borda);
		background: var(--cartao);
		color: var(--texto-2);
	}
	.enviar {
		border: 1px solid var(--acento);
		background: var(--acento);
		color: var(--cartao);
		font-weight: 600;
	}
	.enviar.inactivo, .copiar:disabled { opacity: 0.45; pointer-events: none; }
	/* A confirmação ocupa o painel todo, e é essa a correcção: o que falhava não era a frase,
	   era a frase ser a coisa mais pequena do ecrã logo a seguir ao toque. */
	.recebido {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: var(--e-2);
		padding: var(--e-4) 0 var(--e-2);
	}
	.recebido :global(svg) { color: var(--acento); }
	.recebido-titulo {
		margin: 0;
		font-size: var(--t-titulo);
		font-weight: 600;
		color: var(--texto);
	}
	.recebido-texto {
		margin: 0;
		font-size: var(--t-pequeno);
		color: var(--texto-2);
		line-height: 1.45;
		max-width: 22rem;
	}
	.fechar-grande {
		margin-top: var(--e-3);
		min-height: 44px;
		padding: 0 var(--e-5);
		border-radius: var(--raio);
		border: 1px solid var(--borda);
		background: var(--cartao);
		color: var(--texto-2);
		font-size: var(--t-base);
		cursor: pointer;
	}
	.nota.falhou { color: var(--directo); }
	.nota a { color: inherit; text-decoration: underline; }
	.nota {
		margin: var(--e-3) 0 0;
		font-size: var(--t-micro);
		color: var(--suave);
		line-height: 1.45;
	}
</style>
