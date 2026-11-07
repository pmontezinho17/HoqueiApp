<script lang="ts">
	/**
	 * O separador "Antes do jogo" (#11, fase 1). O que mostrar e como se diz vive em
	 * `$lib/antesDoJogo.ts`; aqui só se desenha.
	 */
	import Emblema from '$lib/Emblema.svelte';
	import {
		linhasDaDisciplina,
		linhasDaForma,
		linhasDosPeriodos,
		treinadoresDoJogo,
		comoFoiJogado,
		linhasDaEpoca,
		linhasDasContagens,
		mostraLugares,
		outraProva,
		diaCurto,
		resumoDosConfrontos,
		sequenciasEmCurso,
		type JogoNaForma,
		type LinhaComparada,
		type Resultado
	} from '$lib/antesDoJogo';
	import type { Prejogo } from '$lib/tipos';

	let {
		p,
		emblemas,
		comp,
		depoisDoApito = false
	}: { p: Prejogo; emblemas: Record<string, string>; comp: number | null; depoisDoApito?: boolean } = $props();

	const NOME: Record<Resultado, string> = { V: 'vitória', E: 'empate', D: 'derrota' };

	const forma = $derived(linhasDaForma(p));
	const epoca = $derived(linhasDaEpoca(p));
	const contagens = $derived(linhasDasContagens(p));
	const confrontos = $derived(resumoDosConfrontos(p));
	const emCurso = $derived({ casa: sequenciasEmCurso(p.casa), fora: sequenciasEmCurso(p.fora) });
	const periodos = $derived({ marcados: linhasDosPeriodos(p, 'marcados'), sofridos: linhasDosPeriodos(p, 'sofridos') });
	const disciplina = $derived(linhasDaDisciplina(p));
	const treinadores = $derived(treinadoresDoJogo(p));
</script>

{#snippet jogo(j: JogoNaForma | null)}
	{#if j}
		<a href="/jogo/{j.id}" class="jogo" aria-label="{diaCurto(j.data)}: {j.casa} {j.gc}–{j.gf} {j.fora}, {NOME[j.resultado]}">
			<Emblema equipa={j.casa} src={emblemas[j.casa]} tamanho={22} />
			<b class="r {j.resultado}">{j.gc}–{j.gf}</b>
			<Emblema equipa={j.fora} src={emblemas[j.fora]} tamanho={22} />
		</a>
	{:else}
		<span></span>
	{/if}
{/snippet}

{#snippet cabeca(titulo = '')}
	<li class="cabeca">
		<Emblema equipa={p.casa.equipa} src={emblemas[p.casa.equipa]} tamanho={22} />
		<span class="rotulo">{titulo}</span>
		<Emblema equipa={p.fora.equipa} src={emblemas[p.fora.equipa]} tamanho={22} />
	</li>
{/snippet}

{#snippet comparada(l: LinhaComparada)}
	<li>
		<span class="v" class:melhor={l.melhor === 'casa'}>
			{l.casa.texto}{#if l.casa.lugar ?? l.casa.pequeno}<small>{l.casa.lugar ?? l.casa.pequeno}</small>{/if}
		</span>
		<span class="rotulo">{l.rotulo}</span>
		<span class="v" class:melhor={l.melhor === 'fora'}>
			{l.fora.texto}{#if l.fora.lugar ?? l.fora.pequeno}<small>{l.fora.lugar ?? l.fora.pequeno}</small>{/if}
		</span>
	</li>
{/snippet}

{#if depoisDoApito}
	<p class="aviso">Como estavam as duas equipas quando este jogo começou: nada do que se jogou depois entra nestes números.</p>
{/if}

<section>
	<h2>Forma recente</h2>
	{#if forma.length}
		<ul class="cartao forma">
			{@render cabeca()}
			{#each forma as l, i (i)}
				<li class:recente={i === 0}>
					{@render jogo(l.casa)}
					<span class="marca">{#if i === 0}último<br />jogo{/if}</span>
					{@render jogo(l.fora)}
				</li>
			{/each}
		</ul>
	{/if}
	{#each ['casa', 'fora'] as const as lado (lado)}
		{#if !p[lado].ultimos.length}<p class="nada">{p[lado].equipa} ainda não jogou esta época.</p>{/if}
	{/each}
</section>

<section>
	<h2>Confronto directo esta época</h2>
	{#if p.confrontos.length}
		<div class="cartao placar">
			<span>
				<Emblema equipa={p.casa.equipa} src={emblemas[p.casa.equipa]} tamanho={22} />
				<b>{confrontos.casa}</b><small>{confrontos.casa === 1 ? 'vitória' : 'vitórias'}</small>
			</span>
			<span class="meio"><b>{confrontos.empates}</b><small>{confrontos.empates === 1 ? 'empate' : 'empates'}</small></span>
			<span>
				<Emblema equipa={p.fora.equipa} src={emblemas[p.fora.equipa]} tamanho={22} />
				<b>{confrontos.fora}</b><small>{confrontos.fora === 1 ? 'vitória' : 'vitórias'}</small>
			</span>
		</div>
		<ul class="cartao jogos">
			{#each p.confrontos as j (j.id)}
				{@const jogo = comoFoiJogado(j, p.casa.equipa)}
				<li>
					<a href="/jogo/{j.id}" class="confronto">
						<span class="quando">{diaCurto(j.data)}{#if outraProva(j, comp)}<small>{outraProva(j, comp)}</small>{/if}</span>
						<span class="eq casa">{jogo.casa}</span>
						<span class="res">{jogo.gc}–{jogo.gf}</span>
						<span class="eq">{jogo.fora}</span>
					</a>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="nada">Ainda não se defrontaram esta época.</p>
	{/if}
</section>

<section>
	<h2>A época</h2>
	<ul class="cartao lado-a-lado">
		{@render cabeca()}
		{#each epoca as l (l.rotulo)}{@render comparada(l)}{/each}
	</ul>
	{#if mostraLugares(p)}
		<p class="nota">O número pequeno é o lugar entre as {p.na_serie} equipas da série que já jogaram.</p>
	{/if}
</section>

{#if periodos.marcados && periodos.sofridos}
	<section>
		<h2>Quando marcam e quando sofrem</h2>
		<ul class="cartao lado-a-lado">
			{@render cabeca('Golos marcados')}
			{#each periodos.marcados as l (l.rotulo)}{@render comparada(l)}{/each}
		</ul>
		<ul class="cartao lado-a-lado">
			{@render cabeca('Golos sofridos')}
			{#each periodos.sofridos as l (l.rotulo)}{@render comparada(l)}{/each}
		</ul>
	</section>
{/if}

{#if contagens.length || emCurso.casa.length || emCurso.fora.length}
	<section>
		<h2>Sequências</h2>
		{#if contagens.length}
			<ul class="cartao lado-a-lado">
				{@render cabeca()}
				{#each contagens as l (l.rotulo)}{@render comparada(l)}{/each}
			</ul>
		{/if}
		{#each ['casa', 'fora'] as const as lado (lado)}
			{#if emCurso[lado].length}
				<div class="cartao emCurso">
					<p class="quem">
						<Emblema equipa={p[lado].equipa} src={emblemas[p[lado].equipa]} tamanho={18} />
						<span>{p[lado].equipa}</span>
					</p>
					<ul>{#each emCurso[lado] as s (s)}<li>{s}</li>{/each}</ul>
				</div>
			{/if}
		{/each}
	</section>
{/if}

{#if disciplina.length}
	<section>
		<h2>Disciplina e bolas paradas</h2>
		<ul class="cartao lado-a-lado">
			{@render cabeca()}
			{#each disciplina as l (l.rotulo)}{@render comparada(l)}{/each}
		</ul>
	</section>
{/if}

{#if treinadores}
	<section>
		<h2>Treinadores</h2>
		<div class="cartao treinadores">
			{#each ['casa', 'fora'] as const as lado (lado)}
				{@const t = treinadores[lado]}
				<div class="treinador">
					<Emblema equipa={p[lado].equipa} src={emblemas[p[lado].equipa]} tamanho={22} />
					<span>
						<b>{t?.nome ?? '—'}</b>
						{#if t}<small>{t.registo}</small>{/if}
					</span>
				</div>
			{/each}
		</div>
		{#if treinadores.frente}<p class="nota">{treinadores.frente}</p>{/if}
	</section>
{/if}

<style>
	/*
	 * **Uma caixa por análise**, desde 07/11/2026, a pedido do dono: *"cada secção está separada
	 * por um título (…) conseguimos acrescentar algum tipo de caixa entre cada uma das análises
	 * para ter uma leitura mais simples e direta?"*. Até aí cada secção era um título solto com
	 * cartões por baixo, e numa página de sete secções o olho não sabia onde uma acabava.
	 * A caixa é a secção; o que estava em cartões lá dentro passa a listas sem moldura, separadas
	 * por um traço, para não ficar caixa dentro de caixa.
	 */
	section {
		margin: 0 0 var(--e-4);
		padding: var(--e-4);
		border: 1px solid var(--borda);
		border-radius: var(--raio-cartao);
		background: var(--cartao);
	}
	section:first-of-type { margin-top: var(--e-4); }
	.aviso {
		margin: var(--e-4) 0 0;
		font-size: var(--t-pequeno);
		color: var(--texto-2);
	}
	h2 {
		margin: 0 0 var(--e-2);
		padding-bottom: var(--e-3);
		border-bottom: 1px solid var(--borda);
		font-size: var(--t-destaque);
		font-weight: 600;
	}
	.cartao {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	/* duas listas seguidas na mesma caixa: um espaço e um traço entre elas */
	section > :not(h2) + .cartao {
		margin-top: var(--e-3);
		padding-top: var(--e-2);
		border-top: 1px solid var(--borda);
	}
	.nome {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	small {
		display: block;
		font-size: var(--t-micro);
		color: var(--suave);
		font-weight: 400;
	}

	/*
	 * A forma lado a lado (07/11/2026): o resultado num rectângulo com a cor do resultado para a
	 * equipa da coluna — verde, cinzento, vermelho —, e o jogo tal como foi jogado, com a casa à
	 * esquerda. A letra V/E/D saiu: o resultado está escrito, e quem não vê cores lê o número.
	 */
	/* mais baixo do que o emblema, a pedido do dono a 07/11/2026: com 28px o resultado pesava
	   mais do que as equipas, e o que se lê primeiro é quem jogou */
	.r {
		display: inline-grid;
		place-items: center;
		min-width: 2.5rem;
		height: 18px;
		padding: 0 var(--e-1);
		border-radius: 4px;
		font-size: var(--t-pequeno);
		line-height: 1;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		/* a cor do cartão e não branco: no tema escuro as cores de ganhar e perder são claras,
		   e o branco por cima delas não se lia */
		color: var(--cartao);
	}
	.r.V { background: var(--ganha); }
	.r.E { background: var(--suave); }
	.r.D { background: var(--perde); }

	.forma li {
		display: grid;
		grid-template-columns: 1fr 2.8rem 1fr;
		align-items: center;
		min-height: 44px;
	}
	.forma .cabeca { justify-items: center; min-height: 36px; }
	.forma .jogo {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--e-2);
		padding: var(--e-1) 0;
		color: inherit;
		text-decoration: none;
	}
	/* o jogo mais recente: uma faixa por trás da linha e a marca no meio, uma só para os dois */
	.forma li.recente {
		margin: var(--e-1) calc(-1 * var(--e-2));
		padding: 0 var(--e-2);
		border-radius: var(--raio-cartao);
		background: var(--acento-fraco);
	}
	.marca {
		text-align: center;
		font-size: var(--t-micro);
		line-height: 1.2;
		color: var(--texto-2);
		font-weight: 600;
	}

	.jogos li + li { border-top: 1px solid var(--borda-fraca); }
	.jogos a {
		display: grid;
		grid-template-columns: 3.4rem minmax(0, 1fr) auto auto;
		align-items: center;
		gap: var(--e-3);
		min-height: 48px;
		padding: var(--e-2) 0;
		color: inherit;
		text-decoration: none;
		font-size: var(--t-base);
	}
	.quando { font-size: var(--t-pequeno); color: var(--texto-2); min-width: 0; }
	.quando small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.res { font-weight: 700; font-variant-numeric: tabular-nums; }
	.jogos a.confronto { grid-template-columns: 3.4rem minmax(0, 1fr) auto minmax(0, 1fr); }
	.eq { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: var(--t-pequeno); }
	.eq.casa { text-align: right; }

	.placar {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		text-align: center;
		padding: var(--e-3) var(--e-4);
	}
	.placar > span { display: flex; flex-direction: column; align-items: center; gap: var(--e-1); }
	/* o empate sem emblema: desce para ficar com o número à altura dos outros dois */
	.placar .meio { justify-content: flex-end; }
	.placar b { display: block; font-size: var(--t-titulo); font-variant-numeric: tabular-nums; }

	.lado-a-lado li {
		display: grid;
		grid-template-columns: 4.5rem 1fr 4.5rem;
		align-items: center;
		gap: var(--e-2);
		min-height: 44px;
		padding: var(--e-2) 0;
	}
	.lado-a-lado li + li { border-top: 1px solid var(--borda-fraca); }
	.lado-a-lado .cabeca { min-height: 40px; justify-items: center; }
	.lado-a-lado .rotulo {
		text-align: center;
		font-size: var(--t-pequeno);
		color: var(--texto-2);
	}
	.lado-a-lado .v {
		text-align: center;
		font-size: var(--t-destaque);
		font-variant-numeric: tabular-nums;
		color: var(--texto-2);
	}
	.lado-a-lado .v.melhor { color: var(--texto); font-weight: 700; }

	.lado-a-lado .cabeca .rotulo { font-weight: 600; color: var(--texto); }

	.treinadores { padding: 0; }
	.treinador {
		display: flex;
		align-items: center;
		gap: var(--e-3);
		min-height: 48px;
		padding: var(--e-2) 0;
		font-size: var(--t-base);
	}
	.treinador + .treinador { border-top: 1px solid var(--borda-fraca); }
	.treinador b { font-weight: 600; }

	.emCurso { padding-bottom: 0; }
	.emCurso .quem {
		display: flex;
		align-items: center;
		gap: var(--e-2);
		margin: 0 0 var(--e-2);
		font-size: var(--t-pequeno);
		font-weight: 600;
	}
	.emCurso ul { margin: 0; padding-left: var(--e-5); font-size: var(--t-base); line-height: 1.6; }

	.nada, .nota {
		margin: var(--e-3) 0 0;
		font-size: var(--t-pequeno);
		color: var(--suave);
	}
</style>
