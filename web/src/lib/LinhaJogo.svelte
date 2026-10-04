<script lang="ts">
	import Emblema from './Emblema.svelte';
	import { emCurso, escalaoCurto, faseCurta } from './formato';
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
			<!-- O ponto a pulsar lê-se antes do texto; o texto é para quem não vê cor.
			     E o texto é a fase do jogo, não "AO VIVO": a cor e o ponto já dizem que
			     está a decorrer, e o que não se sabia era se ia no início ou no fim — era
			     isso que decidia se valia a pena entrar. Sem fase nos dados (ficheiro
			     antigo, ou ronda que não chegou a escrevê-la) volta a "AO VIVO". -->
			<span class="vivo"><i aria-hidden="true"></i>{faseCurta(jogo) ?? 'AO VIVO'}</span>
			{#if jogo.relogio}<span class="conta">{jogo.relogio}</span>{/if}
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
		align-items: center; gap: var(--e-3);
		padding: var(--e-4) var(--e-1);
		/* separador fraco **dentro** de uma secção; o forte fica para a dividir da
		   seguinte. São dois níveis onde antes havia um, e é isso que faz a lista ler-se
		   como blocos em vez de uma régua contínua. */
		border-bottom: 1px solid var(--borda-fraca);
		text-decoration: none; color: inherit;
		font-size: var(--t-base);
	}
	.ligavel:hover, .ligavel:focus-visible { background: var(--acento-fraco); outline: none; }
	/* no telemóvel não há `hover`: sem isto, tocar numa linha não dá retorno nenhum */
	.ligavel:active { background: var(--acento-fraco); }

	.quando { display: flex; flex-direction: column; line-height: 1.3; }
	.dia, .hora { color: var(--suave); font-variant-numeric: tabular-nums;
		font-size: var(--t-pequeno); }

	/* um jogo a decorrer tem de se distinguir de um já fechado antes de ser lido */
	.escalao { font-size: var(--t-micro); font-weight: 600; letter-spacing: 0.03em;
		color: var(--suave); white-space: nowrap; }

	/* `nowrap`: na coluna de 3.1rem o "AO VIVO" partia-se em duas linhas */
	.vivo { display: inline-flex; align-items: center; gap: var(--e-1); white-space: nowrap;
		font-size: var(--t-micro); font-weight: 600; letter-spacing: 0.03em; color: var(--vivo); }
	.vivo i { width: 6px; height: 6px; border-radius: 50%; background: var(--vivo);
		animation: pulsar 1.6s ease-in-out infinite; }
	/* tabulares: o relógio muda a cada ronda e com largura variável dançava na coluna */
	.conta { font-size: var(--t-pequeno); font-weight: 600; color: var(--vivo);
		font-variant-numeric: tabular-nums; }
	@keyframes pulsar { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
	@media (prefers-reduced-motion: reduce) { .vivo i { animation: none; } }
	.dia { font-weight: 600; }

	.equipa { display: flex; align-items: center; gap: var(--e-2); min-width: 0; }
	.equipa.casa { justify-content: flex-end; text-align: right; }
	/* quem perdeu recua para o nível secundário: lê-se quem ganhou sem ler os números */
	.nome { overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
		color: var(--texto-2); }
	.vencedor .nome { color: var(--texto); font-weight: 600; }
	.minha .nome { color: var(--acento); font-weight: 600; }

	.meio { min-width: 2.6rem; text-align: center; }
	.placar { font-variant-numeric: tabular-nums; font-size: var(--t-destaque); }
	.placar i { color: var(--suave); font-style: normal; margin: 0 var(--e-0);
		font-size: var(--t-pequeno); vertical-align: 0.08em; }
	.placar b { font-weight: 400; color: var(--texto-2); }
	.placar b.vencedor { font-weight: 600; color: var(--texto); }
	.vs { color: var(--suave); font-size: var(--t-pequeno); }
</style>
