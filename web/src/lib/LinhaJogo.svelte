<script lang="ts">
	import Emblema from './Emblema.svelte';
	import { emCurso, escalaoCurto } from './formato';
	import type { JogoAgenda } from './tipos';

	let {
		jogo, emblemas, seguida, comData = false, comEscalao = false
	}: {
		jogo: JogoAgenda;
		emblemas: Record<string, string>;
		seguida?: (equipa: string) => boolean;
		/** numa lista agrupada por dia a data é redundante; numa lista corrida é essencial */
		comData?: boolean;
		/** idem para o escalão: nas secções por competição vive no cabeçalho, mas as listas
		 *  agregadas — "a decorrer agora", "as minhas equipas" — misturam escalões e sem
		 *  isto não se sabe se o 11-5 é de benjamins ou de seniores */
		comEscalao?: boolean;
	} = $props();

	const jogado = $derived(jogo.gc !== null && jogo.gf !== null);
	const live = $derived(emCurso(jogo));
	const ganhouCasa = $derived(jogado && jogo.gc! > jogo.gf!);
	const ganhouFora = $derived(jogado && jogo.gf! > jogo.gc!);
	// Um jogo por disputar passa a ser clicável quando já há ficha: a fonte publica a
	// convocatória dias antes, e é isso que se quer ver na véspera.
	const destino = $derived(
		jogo.id && (jogado || jogo.tem_ficha) ? `/jogo/${jogo.id}` : null
	);

	const diaCurto = (iso: string) => {
		const d = new Date(`${iso}T00:00:00`);
		return `${d.getDate()}/${d.getMonth() + 1}`;
	};
</script>

<!--
  Linha plana com separador de 1px, não cartão: medido contra a FotMob, o cartão
  (raio + borda + margem) punha a linha a 81,6px contra os 56px deles. E a competição
  vive no cabeçalho da secção, não repetida aqui — era a terceira linha de texto que
  custava 25px por jogo. Ver docs/04-benchmarking.md.
-->
<svelte:element this={destino ? 'a' : 'div'} href={destino} class="linha" class:ligavel={destino}>
	<span class="quando">
		{#if live}
			<!-- o ponto a pulsar lê-se antes do texto; o texto é para quem não vê cor -->
			<span class="vivo"><i aria-hidden="true"></i>AO VIVO</span>
		{:else}
			{#if comData && jogo.data}<span class="dia">{diaCurto(jogo.data)}</span>{/if}
			<span class="hora">{jogo.hora ?? '—'}</span>
		{/if}
		{#if comEscalao}<span class="escalao">{escalaoCurto(jogo.cat)}</span>{/if}
	</span>

	<span class="equipa casa" class:vencedor={ganhouCasa} class:minha={seguida?.(jogo.casa)}>
		<span class="nome">{jogo.casa}</span>
		<Emblema equipa={jogo.casa} src={emblemas[jogo.casa]} tamanho={18} />
	</span>

	<span class="meio">
		{#if jogado}
			<span class="placar"><b class:vencedor={ganhouCasa}>{jogo.gc}</b><i>–</i><b class:vencedor={ganhouFora}>{jogo.gf}</b></span>
		{:else}
			<span class="vs" aria-hidden="true">v</span>
		{/if}
	</span>

	<span class="equipa fora" class:vencedor={ganhouFora} class:minha={seguida?.(jogo.fora)}>
		<Emblema equipa={jogo.fora} src={emblemas[jogo.fora]} tamanho={18} />
		<span class="nome">{jogo.fora}</span>
	</span>
</svelte:element>

<style>
	.linha {
		display: grid;
		grid-template-columns: 3.1rem 1fr auto 1fr;
		align-items: center; gap: 0.45rem;
		padding: 0.5rem 0.2rem;
		border-bottom: 1px solid var(--borda);
		text-decoration: none; color: inherit;
		/* 12px como a referência: a hierarquia faz-se com peso e cor, não com tamanho */
		font-size: 0.75rem;
	}
	.ligavel:hover, .ligavel:focus-visible { background: var(--acento-fraco); outline: none; }

	.quando { display: flex; flex-direction: column; line-height: 1.25; }
	.dia, .hora { color: var(--suave); font-variant-numeric: tabular-nums; font-size: 0.7rem; }

	/* um jogo a decorrer tem de se distinguir de um já fechado antes de ser lido */
	.escalao { font-size: 0.54rem; font-weight: 600; letter-spacing: 0.03em;
		color: var(--suave); white-space: nowrap; }

	/* `nowrap`: na coluna de 3.1rem o "AO VIVO" partia-se em duas linhas */
	.vivo { display: inline-flex; align-items: center; gap: 0.25rem; white-space: nowrap;
		font-size: 0.58rem; font-weight: 700; letter-spacing: 0.04em; color: var(--vivo); }
	.vivo i { width: 6px; height: 6px; border-radius: 50%; background: var(--vivo);
		animation: pulsar 1.6s ease-in-out infinite; }
	@keyframes pulsar { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
	@media (prefers-reduced-motion: reduce) { .vivo i { animation: none; } }
	.dia { font-weight: 600; }

	.equipa { display: flex; align-items: center; gap: 0.35rem; min-width: 0; }
	.equipa.casa { justify-content: flex-end; text-align: right; }
	.nome { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.vencedor { font-weight: 700; }
	.minha .nome { color: var(--acento); font-weight: 600; }

	.meio { min-width: 2.4rem; text-align: center; }
	.placar { font-variant-numeric: tabular-nums; font-size: 0.82rem; }
	.placar i { color: var(--suave); font-style: normal; margin: 0 0.1rem; }
	.placar b { font-weight: 400; }
	.placar b.vencedor { font-weight: 700; }
	.vs { color: var(--suave); font-size: 0.68rem; }
</style>
