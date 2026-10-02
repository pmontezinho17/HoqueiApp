<script lang="ts">
	import Folha from '$lib/Folha.svelte';
	import { slug } from '$lib/slug';

	let { equipa, categoria }: { equipa: string; categoria: string } = $props();

	let aberta = $state(false);
	let copiado = $state(false);

	/** O mesmo nome que o scraper escreve: `sub-13--parede-fc-b.ics`. */
	const caminho = $derived(`/v1/aplisboa/2026-27/team/${slug(categoria)}--${slug(equipa)}.ics`);
	const url = $derived(
		typeof location === 'undefined' ? caminho : new URL(caminho, location.origin).href
	);
	const webcal = $derived(url.replace(/^https?:/, 'webcal:'));
	/**
	 * O caminho oficial do Google para subscrever um feed. Abre o Google Calendar já com a
	 * pergunta "adicionar este calendário?", e funciona no browser do telemóvel — ao
	 * contrário da **aplicação** do Google Calendar, que não sabe subscrever endereços.
	 */
	const googleUrl = $derived(
		`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`
	);
	const ficheiro = $derived(`${slug(equipa)}-${slug(categoria)}.ics`);

	/**
	 * Cada plataforma tem **um** caminho que funciona, e mostrar os outros só atrapalha.
	 * O `webcal:` não tem quem o atenda no Android: o botão não fazia nada, que foi
	 * exactamente o que aconteceu ao primeiro utilizador a experimentar.
	 */
	type Sistema = 'android' | 'ios' | 'outro';
	const sistema = $derived.by<Sistema>(() => {
		if (typeof navigator === 'undefined') return 'outro';
		const ua = navigator.userAgent;
		if (/Android/i.test(ua)) return 'android';
		// o iPad diz-se "Macintosh" desde o iPadOS 13; distingue-se pelo toque.
		// Um Mac a sério fica em 'outro' de propósito: num ecrã grande não há razão
		// para esconder o caminho do Google a quem usa Google Calendar.
		if (/iPhone|iPod/i.test(ua)) return 'ios';
		if (/iPad|Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return 'ios';
		return 'outro';
	});

	async function copiar() {
		try {
			await navigator.clipboard.writeText(url);
			copiado = true;
			setTimeout(() => (copiado = false), 2500);
		} catch {
			copiado = false;
		}
	}
</script>

<button class="abrir" onclick={() => (aberta = true)}>
	<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"
		fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
		<rect x="3" y="5" width="18" height="16" rx="2" />
		<path d="M3 10h18M8 3v4M16 3v4M12 14v4M10 16h4" />
	</svg>
	Adicionar ao meu calendário
</button>

<Folha bind:aberta titulo="Adicionar ao calendário">
	<p class="intro">
		Os jogos de <strong>{equipa}</strong> ({categoria}) no calendário do teu telemóvel.
	</p>

	<!--
		O ficheiro vem primeiro de propósito, e a subscrição a seguir.
		A primeira versão punha a subscrição em cima, porque é a melhor em teoria: corrige-se
		sozinha. Mas o Google **não vai buscar o calendário quando o adicionamos** — pode
		demorar horas —, e quem subscreve fica a olhar para um calendário vazio sem perceber
		porquê. Uma funcionalidade que precisa que o utilizador saiba disso e espere não é uma
		funcionalidade. O ficheiro põe os jogos lá no momento; a subscrição é o extra.
	-->
	<a class="principal" href={url} download={ficheiro}>Adicionar os jogos agora</a>
	<p class="dica">
		Descarrega e abre no calendário: os jogos entram <strong>já</strong>. Como cada jogo tem
		identificador próprio, voltar a fazer isto mais tarde actualiza-os em vez de os duplicar.
	</p>

	<p class="ou">e, se quiseres, que se corrija sozinho</p>

	{#if sistema !== 'ios'}
		<a class="principal secundaria" href={googleUrl} target="_blank" rel="noopener">
			Subscrever no Google Calendar
		</a>
	{/if}
	{#if sistema !== 'android'}
		<a class="principal secundaria" href={webcal}>Subscrever no calendário</a>
		<p class="dica">No iPhone e no Mac, abre o calendário directamente.</p>
	{/if}

	<p class="aviso">
		<strong>A subscrição demora a aparecer.</strong> O Google só vai buscar o calendário
		horas depois de o adicionares — às vezes no dia seguinte — e não tem botão para forçar.
		Depois disso corrige-se sozinho sempre que um jogo mudar. No iPhone é mais rápido e dá
		para escolher de quanto em quanto tempo.
	</p>

	<div class="url">
		<code>{url}</code>
		<button onclick={copiar}>{copiado ? 'Copiado ✓' : 'Copiar'}</button>
	</div>

	<details>
		<summary>Subscrever à mão</summary>
		{#if sistema === 'ios'}
			<ol>
				<li><strong>Definições → Aplicações → Calendário → Contas</strong></li>
				<li><strong>Adicionar conta → Outra → Adicionar calendário subscrito</strong></li>
				<li>Cola o endereço e confirma.</li>
			</ol>
		{:else}
			<ol>
				<li>Copia o endereço aqui em cima.</li>
				<li>Abre o <strong>site</strong> do Google Calendar (a aplicação não tem esta opção).</li>
				<li>Na barra lateral: <strong>Outros calendários → + → A partir do URL</strong></li>
				<li>Cola e carrega em <strong>Adicionar calendário</strong>.</li>
			</ol>
		{/if}
	</details>
</Folha>

<style>
	.abrir {
		display: inline-flex; align-items: center; gap: 0.4rem;
		min-height: 44px; padding: 0 0.8rem; font-size: 0.74rem; cursor: pointer;
		border-radius: 999px; border: 1px solid var(--borda);
		background: var(--cartao); color: var(--suave);
	}
	.abrir:hover { border-color: var(--acento); color: var(--acento); }

	.intro, .dica, .aviso, .ou { margin: 0 0 0.8rem; font-size: 0.8rem; line-height: 1.45; }
	.dica { margin-top: -0.3rem; margin-bottom: 1rem; font-size: 0.7rem; color: var(--suave); }
	.ou { margin: 0.2rem 0 0.5rem; font-size: 0.7rem; color: var(--suave); text-align: center; }

	.principal {
		display: flex; align-items: center; justify-content: center;
		min-height: 48px; margin-bottom: 0.5rem; font-size: 0.84rem; font-weight: 600;
		border-radius: 10px; text-decoration: none;
	}
	.principal { background: var(--acento); color: var(--fundo); }
	.principal.secundaria {
		background: var(--cartao); color: var(--texto); border: 1px solid var(--borda);
	}

	.url { display: flex; align-items: stretch; gap: 0.4rem; margin-bottom: 1rem; }
	code {
		flex: 1; min-width: 0; padding: 0.5rem 0.6rem; font-size: 0.66rem;
		overflow-x: auto; white-space: nowrap; border-radius: 8px;
		border: 1px solid var(--borda); background: var(--cartao);
	}
	.url button {
		min-height: 44px; padding: 0 0.8rem; font-size: 0.74rem; cursor: pointer;
		white-space: nowrap; border-radius: 8px;
		border: 1px solid var(--borda); background: var(--cartao); color: var(--texto);
	}

	details { margin-bottom: 0.7rem; font-size: 0.78rem; }
	summary { min-height: 44px; display: flex; align-items: center; cursor: pointer;
		color: var(--acento); }
	ol { margin: 0.2rem 0 0.4rem; padding-left: 1.2rem; line-height: 1.5; }
	li { margin-bottom: 0.3rem; }

	.aviso {
		padding: 0.6rem 0.7rem; font-size: 0.72rem; border-radius: 8px;
		background: var(--aviso-fundo); color: var(--aviso);
	}
</style>
