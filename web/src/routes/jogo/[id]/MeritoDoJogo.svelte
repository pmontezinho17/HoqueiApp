<script lang="ts">
	/**
	 * O separador do Mérito: a conta deste jogo, regra a regra, as duas equipas lado a lado.
	 *
	 * Separador próprio e não por baixo da classificação, por decisão do dono a 27/10/2026. O
	 * Mérito de um jogo é informação **deste jogo**, como os eventos e o boletim; a classificação
	 * responde a "onde está a minha equipa". Por baixo da tabela da série o bloco ficava depois de
	 * 6 a 10 linhas e de uma legenda, e quase ninguém lá chegava. As decisões vivem no
	 * `meritoDoJogo.ts`, onde os testes as alcançam.
	 */
	import Emblema from '$lib/Emblema.svelte';
	import { linhasDoMerito } from '$lib/meritoDoJogo';
	import type { MeritoDaEquipa } from '$lib/tipos';

	let {
		casa, fora, emblemas
	}: {
		casa: MeritoDaEquipa;
		fora: MeritoDaEquipa;
		emblemas: Record<string, string>;
	} = $props();

	const linhas = $derived(linhasDoMerito(casa, fora));
	const ganha = $derived(linhas.filter((l) => l.grupo === 'ganha'));
	const perde = $derived(linhas.filter((l) => l.grupo === 'perde'));
	const avisos = $derived(
		[casa, fora].flatMap((m) => m.avisos.map((a) => ({ equipa: m.equipa, texto: a })))
	);
	const ponto = (n: number | null) => (n === null ? '·' : n > 0 ? `+${n}` : `${n}`.replace('-', '−'));
	const numero = (n: number) => `${n}`.replace('-', '−');
</script>

<section>
	<h3>Mérito deste jogo</h3>
	<!-- Só o placar do Mérito. Tinha por baixo "resultado do jogo 3–5 · só conta para os +3 de
	     quem marca mais"; o dono tirou-o a 29/10/2026 porque a tabela já o diz, na linha "Marcou
	     mais golos", e o resultado do jogo está no topo do ecrã. -->
	<div class="placar">
		<span class="eq">{casa.equipa}</span>
		<span class="pts">{numero(casa.total)} – {numero(fora.total)}</span>
		<span class="eq dir">{fora.equipa}</span>
	</div>

	<table>
		<thead>
			<tr>
				<th scope="col"><span class="so-voz">Regra</span></th>
				<th scope="col" class="v" aria-label={casa.equipa}>
					<Emblema equipa={casa.equipa} src={emblemas[casa.equipa]} tamanho={20} />
				</th>
				<th scope="col" class="v" aria-label={fora.equipa}>
					<Emblema equipa={fora.equipa} src={emblemas[fora.equipa]} tamanho={20} />
				</th>
			</tr>
		</thead>
		{#each [['Ganha', ganha], ['Perde', perde]] as const as [titulo, grupo] (titulo)}
			{#if grupo.length}
				<tbody>
					<tr class="grupo"><th colspan="3" scope="colgroup">{titulo}</th></tr>
					{#each grupo as l (l.chave)}
						<tr>
							<th scope="row">{l.rotulo}{#if l.detalhe}<span class="det">{l.detalhe}</span>{/if}</th>
							<td class="v" class:ganha={(l.casa ?? 0) > 0} class:perde={(l.casa ?? 0) < 0}>{ponto(l.casa)}</td>
							<td class="v" class:ganha={(l.fora ?? 0) > 0} class:perde={(l.fora ?? 0) < 0}>{ponto(l.fora)}</td>
						</tr>
					{/each}
				</tbody>
			{/if}
		{/each}
		<tfoot>
			<tr><th scope="row">Mérito</th><td class="v">{numero(casa.total)}</td><td class="v">{numero(fora.total)}</td></tr>
		</tfoot>
	</table>

	{#each avisos as a (a.equipa + a.texto)}
		<p class="aviso"><b>Por confirmar, {a.equipa}:</b> {a.texto}</p>
	{/each}

	<p class="nota">
		Contado por nós a partir do boletim que a associação publica. A pontuação oficial é a da
		folha de controlo do jogo.
	</p>
</section>

<style>
	section { margin-bottom: 1.2rem; }
	h3 { font-size: 0.68rem; margin: 0 0 0.4rem; color: var(--suave);
		letter-spacing: 0.04em; text-transform: uppercase; font-weight: 600; }

	.placar { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center;
		gap: var(--e-3); background: var(--heroi); color: var(--heroi-texto);
		border-radius: var(--raio); padding: var(--e-4) var(--e-3); margin-bottom: var(--e-4); }
	.placar .eq { font-size: var(--t-pequeno); font-weight: 600; line-height: 1.25; min-width: 0;
		overflow-wrap: anywhere; }
	.placar .dir { text-align: right; }
	.placar .pts { font-size: var(--t-placar); font-weight: 700; white-space: nowrap;
		font-variant-numeric: tabular-nums; }

	table { width: 100%; border-collapse: collapse; font-size: 0.78rem;
		font-variant-numeric: tabular-nums; }
	th, td { padding: 0.4rem 0.3rem; text-align: left; vertical-align: top; font-weight: 400; }
	thead th { border-bottom: 1px solid var(--borda); padding-top: 0; }
	thead th.v :global(*) { margin-left: auto; }
	.v { width: 3.4rem; text-align: right; white-space: nowrap; }
	thead .v { vertical-align: bottom; }
	tbody tr + tr > * { border-top: 1px solid var(--borda-fraca); }
	tr.grupo th { font-size: 0.64rem; color: var(--suave); font-weight: 600; letter-spacing: 0.04em;
		text-transform: uppercase; padding-top: var(--e-4); }
	.det { display: block; font-size: var(--t-micro); color: var(--suave); }
	td.v { color: var(--suave); }
	td.ganha { color: var(--ganha); font-weight: 600; }
	td.perde { color: var(--perde); font-weight: 600; }
	tfoot > tr > * { border-top: 1px solid var(--borda); font-weight: 700; font-size: var(--t-destaque); }
	tfoot td.v { color: var(--texto); }

	.aviso { margin: var(--e-3) 0 0; background: var(--aviso-fundo); color: var(--aviso);
		border-radius: var(--raio); padding: var(--e-3); font-size: var(--t-pequeno); line-height: 1.4; }
	.nota { margin: var(--e-4) 0 0; font-size: 0.68rem; color: var(--suave); }
	.so-voz { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
		overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
</style>
