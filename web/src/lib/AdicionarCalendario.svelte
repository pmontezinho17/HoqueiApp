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
	// `webcal:` faz o iPhone e o Mac abrirem o calendário já na janela de subscrição.
	// No Android quase nunca funciona, por isso lá a instrução é colar o endereço.
	const webcal = $derived(url.replace(/^https?:/, 'webcal:'));

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
		Os jogos de <strong>{equipa}</strong> ({categoria}) entram no calendário do teu telemóvel.
		Subscreves uma vez e, quando a associação adiar um jogo, <strong>o teu calendário
		corrige-se sozinho</strong> — mesmo que desinstales esta aplicação.
	</p>

	<a class="principal" href={webcal}>Subscrever no calendário</a>
	<p class="dica">No iPhone e no Mac, este botão abre o calendário directamente.</p>

	<div class="url">
		<code>{url}</code>
		<button onclick={copiar}>{copiado ? 'Copiado ✓' : 'Copiar'}</button>
	</div>

	<details>
		<summary>Android e Google Calendar</summary>
		<ol>
			<li>Copia o endereço aqui em cima.</li>
			<li>Abre o <strong>Google Calendar num computador</strong> — a aplicação de telemóvel
				não deixa subscrever endereços.</li>
			<li>Na barra lateral, <strong>Outros calendários → + → A partir do URL</strong>.</li>
			<li>Cola o endereço e carrega em <strong>Adicionar calendário</strong>.</li>
		</ol>
		<p>Depois disso aparece também no telemóvel, na mesma conta Google.</p>
	</details>

	<details>
		<summary>iPhone, passo a passo</summary>
		<ol>
			<li><strong>Definições → Aplicações → Calendário → Contas</strong>.</li>
			<li><strong>Adicionar conta → Outra → Adicionar calendário subscrito</strong>.</li>
			<li>Cola o endereço e confirma.</li>
		</ol>
	</details>

	<p class="aviso">
		<strong>Quanto demora a actualizar.</strong> O ritmo é do calendário, não nosso: o Google
		relê a cada 12 a 24 horas e não deixa forçar; o iPhone deixa escolher e pode ser de 15 em
		15 minutos. Para um jogo adiado à última hora, conta com atraso.
	</p>
</Folha>

<style>
	.abrir {
		display: inline-flex; align-items: center; gap: 0.4rem;
		min-height: 44px; padding: 0 0.8rem; font-size: 0.74rem; cursor: pointer;
		border-radius: 999px; border: 1px solid var(--borda);
		background: var(--cartao); color: var(--suave);
	}
	.abrir:hover { border-color: var(--acento); color: var(--acento); }

	.intro, .dica, .aviso { margin: 0 0 0.8rem; font-size: 0.8rem; line-height: 1.45; }
	.dica { margin-top: -0.4rem; font-size: 0.7rem; color: var(--suave); }
	.principal {
		display: flex; align-items: center; justify-content: center;
		min-height: 48px; margin-bottom: 0.5rem; font-size: 0.84rem; font-weight: 600;
		border-radius: 10px; text-decoration: none;
		background: var(--acento); color: var(--fundo);
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
	details p { margin: 0.3rem 0 0; font-size: 0.74rem; color: var(--suave); }

	.aviso {
		padding: 0.6rem 0.7rem; font-size: 0.72rem; border-radius: 8px;
		background: var(--aviso-fundo); color: var(--aviso);
	}
</style>
