<script lang="ts">
	import Folha from '$lib/Folha.svelte';
	import { SITIO } from './sitio';
	import { dataCurta, horaCurta } from '$lib/formato';
	import { clube, escalao } from '$lib/nomes';
	import { slug } from '$lib/slug';
	import type { Jogo } from '$lib/tipos';

	let {
		equipa,
		categoria,
		jogos,
		recintos = {}
	}: {
		equipa: string;
		categoria: string;
		jogos: Jogo[];
		/** nome do recinto → morada. O nome sozinho não geocodifica: tocar na localização
		 *  do evento não levava a lado nenhum. */
		recintos?: Record<string, string>;
	} = $props();

	let aberta = $state(false);
	let copiado = $state(false);
	let mostrarTodos = $state(false);

	const caminho = $derived(`/v1/aplisboa/2026-27/team/${slug(categoria)}--${slug(equipa)}.ics`);
	const url = $derived(
		typeof location === 'undefined' ? caminho : new URL(caminho, location.origin).href
	);
	const webcal = $derived(url.replace(/^https?:/, 'webcal:'));
	const googleUrl = $derived(
		`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`
	);
	const ficheiro = $derived(`${slug(equipa)}-${slug(categoria)}.ics`);

	type Sistema = 'android' | 'ios' | 'outro';
	const sistema = $derived.by<Sistema>(() => {
		if (typeof navigator === 'undefined') return 'outro';
		const ua = navigator.userAgent;
		if (/Android/i.test(ua)) return 'android';
		// o iPad diz-se "Macintosh" desde o iPadOS 13; distingue-se pelo toque
		if (/iPhone|iPod/i.test(ua)) return 'ios';
		if (/iPad|Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return 'ios';
		return 'outro';
	});

	const hoje = new Date().toISOString().slice(0, 10);
	/** Só de hoje em diante: ninguém quer jogos antigos no calendário pessoal. */
	const proximos = $derived(
		jogos
			.filter((j) => (j.data ?? '') >= hoje)
			.sort((a, b) => `${a.data}${a.hora ?? ''}`.localeCompare(`${b.data}${b.hora ?? ''}`))
	);

	/**
	 * Link de evento do Google Calendar — o único caminho que **funciona sempre** no Android.
	 *
	 * O ficheiro `.ics` ia parar à pasta de Transferências e ficava lá: quem não souber que
	 * tem de o ir abrir à mão, fica sem jogos nenhuns e sem perceber porquê. Isto abre o
	 * Google Calendar com o jogo já preenchido e um botão de guardar.
	 */
	function linkGoogle(j: Jogo): string {
		const titulo = `🏑 ${escalao(categoria)} 🏑 ${clube(j.casa)} vs ${clube(j.fora)}`;
		const p = new URLSearchParams({ action: 'TEMPLATE', text: titulo });
		if (j.data && j.hora) {
			const inicio = new Date(`${j.data}T${j.hora.slice(0, 5)}:00`);
			const fim = new Date(inicio.getTime() + 90 * 60_000);
			const f = (d: Date) => d.toISOString().replace(/[-:]|\.\d{3}/g, '');
			p.set('dates', `${f(inicio)}/${f(fim)}`);
		} else if (j.data) {
			p.set('dates', `${j.data.replace(/-/g, '')}/${j.data.replace(/-/g, '')}`);
		}
		if (j.recinto) p.set('location', recintos[j.recinto] ?? j.recinto);
		const detalhes = [`${clube(j.casa)} vs ${clube(j.fora)}`];
		if (j.id) detalhes.push(`${SITIO}/jogo/${j.id}`);
		p.set('details', detalhes.join('\n'));
		return `https://calendar.google.com/calendar/render?${p}`;
	}

	const adversario = (j: Jogo) => clube(j.casa === equipa ? j.fora : j.casa);
	const onde = (j: Jogo) => (j.casa === equipa ? 'casa' : 'fora');

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
	{#if proximos.length === 0}
		<p class="intro">Não há jogos marcados para {clube(equipa)}.</p>
	{:else}
		<!--
			Um jogo de cada vez, com o link de evento do Google, porque é o único caminho que
			funciona sempre no Android: abre o calendário com o jogo preenchido e um botão de
			guardar. O ficheiro .ics ia parar às Transferências e ficava lá — quem não soubesse
			que tinha de o ir abrir, ficava sem jogos e sem perceber porquê.
		-->
		<p class="intro">
			Toca num jogo para o guardar no calendário. Abre o calendário já preenchido — só tens
			de confirmar.
		</p>

		<ul class="jogos">
			{#each proximos.slice(0, mostrarTodos ? proximos.length : 4) as j (j.id ?? `${j.data}${j.casa}`)}
				<li>
					<a href={linkGoogle(j)} target="_blank" rel="noopener">
						<span class="quando">
							{dataCurta(j.data)}{j.hora ? ` · ${horaCurta(j.hora)}` : ''}
						</span>
						<span class="quem">{adversario(j)} <small>({onde(j)})</small></span>
						<span class="mais" aria-hidden="true">+</span>
					</a>
				</li>
			{/each}
		</ul>
		{#if proximos.length > 4 && !mostrarTodos}
			<button class="ver" onclick={() => (mostrarTodos = true)}>
				Ver os {proximos.length} jogos
			</button>
		{/if}
	{/if}

	<p class="ou">ou de uma vez, com a época toda</p>

	{#if sistema !== 'ios'}
		<a class="principal secundaria" href={googleUrl} target="_blank" rel="noopener">
			Subscrever no Google Calendar
		</a>
	{/if}
	{#if sistema !== 'android'}
		<a class="principal secundaria" href={webcal}>Subscrever no calendário</a>
	{/if}
	<a class="principal secundaria" href={url} download={ficheiro}>Descarregar ficheiro (.ics)</a>

	<p class="aviso">
		<strong>Estas duas demoram a dar sinal.</strong> O Google só vai buscar um calendário
		subscrito horas depois de o adicionares, e não tem botão para forçar — depois disso
		corrige-se sozinho sempre que um jogo mudar. O ficheiro fica na pasta de
		<strong>Transferências</strong> e tens de o abrir a partir de lá para os jogos entrarem.
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

	.intro, .aviso, .ou { margin: 0 0 0.8rem; font-size: 0.8rem; line-height: 1.45; }

	.jogos { list-style: none; margin: 0 0 0.8rem; padding: 0; }
	.jogos a {
		display: grid; grid-template-columns: 1fr auto; align-items: center;
		gap: 0.1rem 0.6rem; min-height: 54px; padding: 0.5rem 0.7rem;
		margin-bottom: 0.35rem; text-decoration: none;
		border-radius: 10px; border: 1px solid var(--borda); background: var(--cartao);
	}
	.jogos a:hover { border-color: var(--acento); }
	.quando { grid-column: 1; font-size: 0.66rem; color: var(--suave); }
	.quem { grid-column: 1; font-size: 0.82rem; font-weight: 600; }
	.quem small { font-weight: 400; color: var(--suave); }
	.mais { grid-column: 2; grid-row: 1 / span 2; font-size: 1.3rem; color: var(--acento); }
	.ver {
		width: 100%; min-height: 44px; margin-bottom: 0.9rem; font-size: 0.76rem; cursor: pointer;
		border-radius: 10px; border: 1px dashed var(--borda);
		background: none; color: var(--suave);
	}
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
