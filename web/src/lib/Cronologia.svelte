<script lang="ts">
	import { nomeProprio } from '$lib/formato';
	import Bola from './Bola.svelte';
	import type { EventoJogo } from './tipos';

	let {
		eventos, casa, fora, omitidos
	}: { eventos: EventoJogo[]; casa: string; fora: string; omitidos: boolean } = $props();

	/**
	 * Do mais recente para o mais antigo.
	 *
	 * A fonte dá-os por ordem de jogo, e era assim que os mostrávamos — o que obriga a
	 * rolar até ao fim para ver o que acabou de acontecer. Num jogo a decorrer é o
	 * contrário do que se quer: o golo de agora tem de estar onde o polegar já está.
	 * Os antigos vão descendo.
	 */
	const porOrdemInversa = $derived([...eventos].reverse());

	// marcações de estrutura: ocupam a largura toda e não pertencem a nenhum lado
	const ESTRUTURA = new Set(['inicio_parte', 'fim_parte', 'fim_jogo', 'por_iniciar']);

	const ICONE: Record<string, string> = {
		cartao: '▬', falta_equipa: '✋', desconto_tempo: '⏱',
		penalti_falhado: '✕', livre_direto_falhado: '✕'
	};

	function descricao(e: EventoJogo): string {
		if (e.tipo === 'golo') {
			const v = e.variante === 'livre_direto' ? 'Golo de livre direto'
				: e.variante === 'penalti' ? 'Golo de penálti' : 'Golo';
			return v;
		}
		if (e.tipo === 'cartao') return `Cartão ${e.variante}${e.numero ? ` (${e.numero}º)` : ''}`;
		if (e.tipo === 'falta_equipa') return `Falta ${e.numero}`;
		if (e.tipo === 'desconto_tempo') return 'Desconto de tempo';
		if (e.tipo === 'penalti_falhado') return 'Penálti falhado';
		if (e.tipo === 'livre_direto_falhado') return 'Livre direto falhado';
		return e.texto;
	}

	// de que lado cai o evento. Sem equipa (ou equipa desconhecida) fica ao centro.
	const lado = (e: EventoJogo) =>
		e.equipa === casa ? 'casa' : e.equipa === fora ? 'fora' : null;
</script>

{#if omitidos}
	<p class="aviso">Escalão de formação: mostramos o que aconteceu, mas não quem o fez.</p>
{/if}

<ol class="linha">
	{#each porOrdemInversa as e (e.ordem)}
		{#if e.tipo === 'inicio_parte'}
			<li class="marca"><span>{e.parte}ª parte</span></li>
		{:else if e.tipo === 'fim_jogo'}
			<li class="marca fim"><span>Fim do jogo</span></li>
		{:else if !ESTRUTURA.has(e.tipo)}
			{@const l = lado(e)}
			<li class="evento" class:golo={e.tipo === 'golo'}>
				<!--
				  Três colunas: casa | minuto+placar | visitante. A versão anterior era a um
				  só lado, com o visitante recuado — lia-se como uma lista. Assim lê-se como
				  um jogo, que é o que a referência faz.
				-->
				<div class="lado esq">
					{#if l === 'casa'}
						<span class="que">{descricao(e)}</span>
						{#if e.jogador}<span class="quem">{nomeProprio(e.jogador)}</span>{/if}
						{#if e.assistencia}<span class="assist">assist. {nomeProprio(e.assistencia)}</span>{/if}
					{/if}
				</div>

				<div class="centro">
					<span class="minuto">{e.minuto !== null ? `${e.minuto}'` : ''}</span>
					{#if e.tipo === 'golo' && e.golos_casa !== null}
						<span class="placar"><Bola tamanho={11} />{e.golos_casa}–{e.golos_fora}</span>
					{:else}
						<span class="icone" aria-hidden="true">{ICONE[e.tipo] ?? '·'}</span>
					{/if}
				</div>

				<div class="lado dir">
					{#if l === 'fora'}
						<span class="que">{descricao(e)}</span>
						{#if e.jogador}<span class="quem">{nomeProprio(e.jogador)}</span>{/if}
						{#if e.assistencia}<span class="assist">assist. {nomeProprio(e.assistencia)}</span>{/if}
					{:else if l === null}
						<span class="que neutro">{descricao(e)}</span>
					{/if}
				</div>
			</li>
		{/if}
	{/each}
</ol>

<style>
	.aviso { font-size: 0.74rem; color: var(--aviso); background: var(--aviso-fundo);
		padding: 0.45rem 0.65rem; border-radius: 8px; margin: 0 0 0.7rem; }

	.linha { list-style: none; margin: 0; padding: 0; }

	.marca { text-align: center; margin: 0.9rem 0 0.5rem; position: relative; }
	.marca::before { content: ''; position: absolute; inset: 50% 0 auto;
		border-top: 1px solid var(--borda); }
	.marca span { position: relative; background: var(--fundo); padding: 0 0.6rem;
		font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--suave); }
	.marca.fim span { color: var(--acento); font-weight: 600; }

	.evento {
		display: grid; grid-template-columns: 1fr 3.6rem 1fr;
		align-items: center; gap: 0.3rem; padding: 0.3rem 0;
	}
	.evento.golo { background: var(--acento-fraco); border-radius: 8px; }

	.lado { display: flex; flex-direction: column; min-width: 0; font-size: 0.74rem; }
	.esq { align-items: flex-end; text-align: right; }
	.dir { align-items: flex-start; text-align: left; }
	.que { color: var(--suave); }
	.neutro { font-size: 0.72rem; }
	.quem { font-weight: 600; font-size: 0.78rem; }
	.assist { font-size: 0.68rem; color: var(--suave); }
	.lado span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }

	.centro { display: flex; flex-direction: column; align-items: center; gap: 0.1rem; }
	.minuto { font-size: 0.7rem; color: var(--suave); font-variant-numeric: tabular-nums; }
	.placar { display: inline-flex; align-items: center; gap: 0.2rem;
		padding: 0.1rem 0.35rem; border-radius: 999px;
		background: var(--cartao); border: 1px solid var(--acento);
		font-size: 0.74rem; font-weight: 700; font-variant-numeric: tabular-nums; }
	.icone { font-size: 0.72rem; }
</style>
