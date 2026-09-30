<script lang="ts">
	import Bola from './Bola.svelte';
	import type { EventoJogo } from './tipos';

	let { eventos, casa, omitidos }: { eventos: EventoJogo[]; casa: string; omitidos: boolean } =
		$props();

	// as marcações de parte estruturam a timeline; não são acontecimentos em si
	const ESTRUTURA = new Set(['inicio_parte', 'fim_parte', 'fim_jogo', 'por_iniciar']);

	// o golo é desenhado (ver Bola.svelte); os restantes são texto
	const ICONE: Record<string, string> = {
		cartao: '▬', falta_equipa: '✋', desconto_tempo: '⏱',
		penalti_falhado: '✕', livre_direto_falhado: '✕'
	};

	function descricao(e: EventoJogo): string {
		if (e.tipo === 'golo') {
			const v = e.variante === 'livre_direto' ? ' de livre direto'
				: e.variante === 'penalti' ? ' de penálti' : '';
			return `Golo${v}`;
		}
		if (e.tipo === 'cartao') return `Cartão ${e.variante}${e.numero ? ` (${e.numero}º)` : ''}`;
		if (e.tipo === 'falta_equipa') return `Falta de equipa ${e.numero}`;
		if (e.tipo === 'desconto_tempo') return 'Desconto de tempo';
		if (e.tipo === 'penalti_falhado') return 'Penálti falhado';
		if (e.tipo === 'livre_direto_falhado') return 'Livre direto falhado';
		return e.texto;
	}
</script>

{#if omitidos}
	<p class="aviso">
		Escalão de formação: mostramos o que aconteceu, mas não quem o fez.
	</p>
{/if}

<ol class="linha">
	{#each eventos as e (e.ordem)}
		{#if e.tipo === 'inicio_parte'}
			<li class="marca"><span>{e.parte}ª parte</span></li>
		{:else if e.tipo === 'fim_jogo'}
			<li class="marca fim"><span>Fim do jogo</span></li>
		{:else if !ESTRUTURA.has(e.tipo)}
			<li class="evento" class:destaque={e.tipo === 'golo'}
				class:fora={e.equipa !== null && e.equipa !== casa}>
				<span class="minuto">{e.minuto !== null ? `${e.minuto}'` : ''}</span>
				<span class="icone" aria-hidden={e.tipo !== 'golo'}>
					{#if e.tipo === 'golo'}<Bola />{:else}{ICONE[e.tipo] ?? '·'}{/if}
				</span>
				<span class="corpo">
					<span class="que">
						{descricao(e)}
						{#if e.equipa}<span class="equipa">· {e.equipa}</span>{/if}
					</span>
					{#if e.jogador}
						<span class="quem">
							{e.jogador}{#if e.assistencia}<span class="assist"> · assistência de {e.assistencia}</span>{/if}
						</span>
					{/if}
				</span>
				{#if e.golos_casa !== null}
					<span class="placar">{e.golos_casa}–{e.golos_fora}</span>
				{/if}
			</li>
		{/if}
	{/each}
</ol>

<style>
	.aviso { font-size: 0.76rem; color: var(--aviso); background: var(--aviso-fundo);
		padding: 0.5rem 0.7rem; border-radius: 8px; margin: 0 0 0.8rem; }
	.linha { list-style: none; margin: 0; padding: 0 0 0 0.25rem;
		border-left: 2px solid var(--borda); }
	.marca { margin: 0.9rem 0 0.5rem -0.25rem; }
	.marca span { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.06em;
		color: var(--suave); background: var(--fundo); padding-right: 0.5rem; }
	.marca.fim span { color: var(--acento); font-weight: 600; }
	.evento {
		display: grid; grid-template-columns: 2.1rem 1.3rem 1fr auto;
		align-items: baseline; gap: 0.4rem;
		padding: 0.35rem 0.5rem 0.35rem 0.4rem; border-radius: 8px;
	}
	.evento.destaque { background: var(--acento-fraco); }
	/* a equipa visitante recua ligeiramente: dá lados à timeline sem duas colunas,
	   que a 360px não cabem */
	.evento.fora { margin-left: 1.1rem; }
	.minuto { font-size: 0.74rem; color: var(--suave); font-variant-numeric: tabular-nums;
		text-align: right; }
	.icone { font-size: 0.8rem; }
	.corpo { display: flex; flex-direction: column; min-width: 0; }
	.que { font-size: 0.82rem; }
	.equipa { color: var(--suave); }
	.quem { font-size: 0.8rem; font-weight: 600; }
	.assist { font-weight: 400; color: var(--suave); font-size: 0.74rem; }
	.placar { font-size: 0.85rem; font-weight: 700; font-variant-numeric: tabular-nums; }
</style>
