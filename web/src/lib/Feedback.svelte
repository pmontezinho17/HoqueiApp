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
	 * **E o email continua lá, para o que é outra coisa.** Uma sugestão não precisa de resposta,
	 * precisa de ser registada; uma dúvida precisa de resposta. O `mailto:` fica como segunda
	 * via para quando o envio falhar, e como caminho de quem quer falar com uma pessoa.
	 *
	 * O ecrã onde a pessoa está vai junto, porque uma crítica sem saber onde aconteceu
	 * obriga a uma segunda troca de mensagens. Vai escrito à vista no corpo, e não
	 * escondido: quem envia vê tudo o que envia.
	 */
	import Icone from './Icone.svelte';
	import { page } from '$app/state';
	import { CONTACTO } from './contacto';
	import { APP_NOME } from './sitio';
	import { critica } from './critica.svelte';
	import { VERSAO } from './versao';
	import { MAXIMO } from '../../functions/sugerir.js';

	let texto = $state('');
	let copiado = $state(false);
	let caixa = $state<HTMLTextAreaElement | null>(null);

	const ecra = $derived(`${page.url.pathname}${page.url.search}`);
	const contexto = $derived(`ecrã: ${ecra} · versão: ${VERSAO}`);
	const corpo = $derived(`${texto}\n\n—\n${contexto}`);
	const link = $derived(
		`mailto:${CONTACTO}?subject=${encodeURIComponent(`${APP_NOME} — crítica`)}` +
			`&body=${encodeURIComponent(corpo)}`
	);

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

<svelte:window onkeydown={(e) => e.key === 'Escape' && fecharEReiniciar()} />

{#if !critica.aberto}
	<button class="bolha" data-guia="feedback" onclick={() => critica.abrir()} aria-label="Dar uma opinião sobre a aplicação">
		<Icone nome="feedback" tamanho={22} />
	</button>
{:else}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div class="veu" onclick={fecharEReiniciar}></div>
	<div class="painel" role="dialog" aria-label="Dar uma opinião" aria-modal="true">
		<div class="cabeca">
			<strong>{estado === 'enviado' ? 'Mensagem enviada' : 'O que está mal?'}</strong>
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
			<p class="ajuda">
				Diz o que te incomodou, o que falta ou o que não percebeste. Quanto mais directo,
				melhor.
			</p>
			<textarea
				bind:this={caixa}
				bind:value={texto}
				rows="5"
				maxlength={MAXIMO}
				placeholder="Por exemplo: no jogo dos sub-15 os nomes aparecem cortados…"
			></textarea>
			<p class="junto">Vai junto: {contexto}</p>
			<div class="accoes">
				<button class="copiar" onclick={copiar} disabled={!texto.trim()}>
					{copiado ? 'copiado' : 'copiar'}
				</button>
				<button
					class="enviar"
					class:inactivo={!texto.trim() || estado === 'a-enviar'}
					disabled={!texto.trim() || estado === 'a-enviar'}
					onclick={enviar}>{estado === 'a-enviar' ? 'a enviar…' : 'Enviar'}</button
				>
			</div>
			{#if estado === 'falhou'}
				<!-- **A segunda via.** Se o envio falhar, a sugestão não se perde: abre-se o email
				     com o texto já escrito, que é exactamente o que esta caixa fazia antes. -->
				<p class="nota falhou">
					Não deu para enviar daqui.
					<a href={link}>Manda por email</a> — já vai escrito.
				</p>
			{:else}
				<p class="nota">
					Guardamos o que escreveres, com o ecrã e a versão, para o podermos corrigir. Não
					guardamos quem és. Se preferires falar com uma pessoa,
					<a href="mailto:{CONTACTO}">escreve-nos</a>.
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
