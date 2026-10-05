<script lang="ts">
	/**
	 * Botão de crítica, temporário, para a fase de testes.
	 *
	 * **Não há servidor nem recolha.** O texto é montado no aparelho e só sai se a pessoa
	 * carregar em enviar no programa de email dela — exactamente o que a política de
	 * privacidade já descreve em "Escreve-nos". Pôr aqui uma caixa que grava texto noutro
	 * sítio obrigaria a mudar essa página e a passar a guardar coisas de outras pessoas, e
	 * não vale a pena para uma funcionalidade que sai daqui a umas semanas.
	 *
	 * O ecrã onde a pessoa está vai junto, porque uma crítica sem saber onde aconteceu
	 * obriga a uma segunda troca de mensagens. Vai escrito à vista no corpo, e não
	 * escondido: quem envia vê tudo o que envia.
	 */
	import Icone from './Icone.svelte';
	import { page } from '$app/state';
	import { CONTACTO } from './contacto';

	let aberto = $state(false);
	let texto = $state('');
	let copiado = $state(false);
	let caixa = $state<HTMLTextAreaElement | null>(null);

	const contexto = $derived(
		[`ecrã: ${page.url.pathname}${page.url.search}`, `versão dos dados: ${page.data?.meta?.generated_at ?? '?'}`]
			.join('\n')
	);
	const corpo = $derived(`${texto}\n\n—\n${contexto}`);
	const link = $derived(
		`mailto:${CONTACTO}?subject=${encodeURIComponent('Hóquei em patins — crítica')}` +
			`&body=${encodeURIComponent(corpo)}`
	);

	function abrir() {
		aberto = true;
		copiado = false;
		// o foco tem de ir para a caixa, senão quem usa teclado abre e fica sem saber onde está
		requestAnimationFrame(() => caixa?.focus());
	}

	async function copiar() {
		try {
			await navigator.clipboard.writeText(corpo);
			copiado = true;
		} catch {
			copiado = false;
		}
	}
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && (aberto = false)} />

{#if !aberto}
	<button class="bolha" onclick={abrir} aria-label="Dar uma opinião sobre a aplicação">
		<Icone nome="feedback" tamanho={22} />
	</button>
{:else}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div class="veu" onclick={() => (aberto = false)}></div>
	<div class="painel" role="dialog" aria-label="Dar uma opinião" aria-modal="true">
		<div class="cabeca">
			<strong>O que está mal?</strong>
			<button class="fechar" onclick={() => (aberto = false)} aria-label="Fechar">×</button>
		</div>
		<p class="ajuda">
			Diz o que te incomodou, o que falta ou o que não percebeste. Quanto mais directo,
			melhor.
		</p>
		<textarea
			bind:this={caixa}
			bind:value={texto}
			rows="5"
			placeholder="Por exemplo: no jogo dos sub-15 os nomes aparecem cortados…"
		></textarea>
		<p class="junto">Vai junto: {contexto.replace(/\n/g, ' · ')}</p>
		<div class="accoes">
			<button class="copiar" onclick={copiar} disabled={!texto.trim()}>
				{copiado ? 'copiado' : 'copiar'}
			</button>
			<a
				class="enviar"
				class:inactivo={!texto.trim()}
				href={texto.trim() ? link : undefined}
				aria-disabled={!texto.trim()}
				onclick={() => texto.trim() && (aberto = false)}>Enviar por email</a
			>
		</div>
		<p class="nota">
			Abre o teu email com isto escrito. Nada sai daqui sem seres tu a carregar em
			enviar — se preferires o WhatsApp, usa o <em>copiar</em> e cola lá.
		</p>
	</div>
{/if}

<style>
	/* acima da barra de navegação, com a área segura do iPhone contada */
	.bolha {
		position: fixed;
		right: var(--e-4);
		bottom: calc(52px + env(safe-area-inset-bottom) + var(--e-4));
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
	.nota {
		margin: var(--e-3) 0 0;
		font-size: var(--t-micro);
		color: var(--suave);
		line-height: 1.45;
	}
</style>
