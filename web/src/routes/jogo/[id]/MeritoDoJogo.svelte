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
	import { fichaPorEsclarecer, linhasDoMerito } from '$lib/meritoDoJogo';
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
	const porEsclarecer = $derived(fichaPorEsclarecer(casa, fora));
	const avisos = $derived(
		[casa, fora].flatMap((m) => m.avisos.map((a) => ({ equipa: m.equipa, texto: a })))
	);
	const ponto = (n: number | null) => (n === null ? '·' : n > 0 ? `+${n}` : `${n}`.replace('-', '−'));
	const numero = (n: number) => `${n}`.replace('-', '−');
	// o que o placar tem de caber numa linha — ver o `.placar .eq`
	const letras = $derived(Math.max(casa.equipa.length, fora.equipa.length));
	const algarismos = $derived(numero(casa.total).length + numero(fora.total).length);
</script>

<section>
	<h3>Mérito deste jogo</h3>
	<!-- Só o placar do Mérito. Tinha por baixo "resultado do jogo 3–5 · só conta para os +3 de
	     quem marca mais"; o dono tirou-o a 29/10/2026 porque a tabela já o diz, na linha "Marcou
	     mais golos", e o resultado do jogo está no topo do ecrã. -->
	<!-- **Tudo numa linha, e a letra dos nomes só diminui quando o nome é comprido**, por
	     decisão do dono a 29/10/2026. Com 12 px o UD VILAFRANQUENSE A partia-se a meio da
	     palavra ("VILAFRANQUENS / E A"); passar os nomes para baixo dos números resolvia, mas o
	     dono preferiu a linha única. Um tamanho fixo pequeno o bastante para o nome mais comprido
	     dos Encontros caber a 360 px dava 9 px a **todos** os jogos, por isso o tamanho é
	     calculado por jogo, a partir do nome mais comprido dos dois e da largura do ecrã. -->
	<div class="placar" style:--letras={letras} style:--algarismos={algarismos} role="group" aria-label="{casa.equipa} {numero(casa.total)}, {fora.equipa} {numero(fora.total)}">
		<span class="eq casa">{casa.equipa}</span>
		<!-- **Uma linha fina entre os dois números, e não um traço.** Com um total negativo o
		     "14 – −1" lia-se "14 − −1": o traço do placar e o sinal de menos são quase o mesmo
		     desenho. O dono apanhou-o a 29/10/2026 no AD Oeiras A–S Alenquer Benfica. A linha é
		     desenhada e não um "|", que em cada tipo de letra tem outra altura, e um negativo
		     vai a vermelho, como na linha das listas. -->
		<b class="pts" class:neg={casa.total < 0}>{numero(casa.total)}</b>
		<i class="divisor" aria-hidden="true"></i>
		<b class="pts" class:neg={fora.total < 0}>{numero(fora.total)}</b>
		<span class="eq fora">{fora.equipa}</span>
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

	<!-- Uma só, e curta, por decisão do dono a 29/10/2026. Não diz a letra nem a causa de
	     propósito: pode ser um erro de preenchimento que obrigue a corrigir a ficha, e não é
	     fácil de cruzar com o regulamento. Ver `fichaPorEsclarecer`. -->
	{#if porEsclarecer}
		<p class="aviso">
			A ficha de jogo contém elementos que não são claros e, por esse motivo, não é possível
			determinar com exatidão os pontos deste jogo.
		</p>
	{/if}
	{#each avisos as a (a.equipa + a.texto)}
		<p class="aviso"><b>Por confirmar, {a.equipa}:</b> {a.texto}</p>
	{/each}

	<!-- A resposta a quem contesta um ponto, escrita onde a dúvida nasce. A caixa de sugestões
	     não guarda contacto nenhum, por isso o pai que contestou o -3 da AE Física (jogo 9913)
	     não podia receber resposta; decisão do dono a 29/10/2026, depois de ouvir quem conhece o
	     regulamento. A releitura de uma semana é o `_merito_por_rever` do raspador. -->
	<p class="nota">
		Contado por nós a partir do boletim que a associação publica. A pontuação oficial é a da
		folha de controlo do jogo. Se o boletim tiver um erro, é o clube que pede a correcção à
		associação, e a app volta a ler cada jogo uma semana depois para a apanhar.
	</p>
</section>

<style>
	section { margin-bottom: 1.2rem; }
	h3 { font-size: 0.68rem; margin: 0 0 0.4rem; color: var(--suave);
		letter-spacing: 0.04em; text-transform: uppercase; font-weight: 600; }

	.placar { display: grid; grid-template-columns: 1fr auto auto auto 1fr; align-items: center;
		column-gap: var(--e-2); background: var(--heroi); color: var(--heroi-texto);
		border-radius: var(--raio); padding: var(--e-4) var(--e-3); margin-bottom: var(--e-4); }
	.placar .pts { font-size: var(--t-placar); font-weight: 700; line-height: 1.1;
		font-variant-numeric: tabular-nums; white-space: nowrap; }
	.placar .neg { color: var(--perde); }
	.placar .divisor { width: 2px; height: 1.6rem; border-radius: 1px; background: var(--heroi-borda); }
	/* A largura que sobra a cada nome, dividida pela largura de uma letra. Medido a 29/10/2026,
	   no browser e não num canvas: o system-ui da Apple alarga as letras nos tamanhos pequenos,
	   e o canvas a 100 px dava 0,60 por letra quando a 10 px eram 0,66. Dos 29 nomes dos
	   Encontros, a média mais larga é 0,67 do tamanho (CACO A, a 8 px); cada algarismo ou sinal
	   do placar a 28 px ocupa 18,5 px. O 0,7 e os 19 px são isso com folga. Os 26 px são o
	   divisor e as quatro distâncias. Verificado com os 82 jogos publicados a 360 e a 375 px. */
	.placar { container-type: inline-size; }
	.placar .eq { font-weight: 600; line-height: 1.25; min-width: 0; white-space: nowrap;
		font-size: min(var(--t-pequeno),
			calc((100cqi - var(--algarismos) * 19px - 26px) / (2 * var(--letras) * 0.7))); }
	.placar .eq.fora { text-align: right; }

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
