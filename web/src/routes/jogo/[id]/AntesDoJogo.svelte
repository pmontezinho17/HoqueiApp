<script lang="ts">
	/**
	 * O separador "Antes do jogo" (#11, fase 1). O que mostrar e como se diz vive em
	 * `$lib/antesDoJogo.ts`; aqui só se desenha.
	 */
	import Emblema from '$lib/Emblema.svelte';
	import {
		bolasDaForma,
		jogosDaForma,
		linhasDaDisciplina,
		linhasDosPeriodos,
		treinadoresDoJogo,
		comoFoiJogado,
		linhasDaEpoca,
		linhasDasContagens,
		mostraLugares,
		outraProva,
		diaCurto,
		resultadoDe,
		resumoDosConfrontos,
		sequenciasEmCurso,
		type Lado,
		type LinhaComparada,
		type Resultado
	} from '$lib/antesDoJogo';
	import type { Prejogo } from '$lib/tipos';

	let { p, emblemas, comp }: { p: Prejogo; emblemas: Record<string, string>; comp: number | null } = $props();

	const NOME: Record<Resultado, string> = { V: 'vitória', E: 'empate', D: 'derrota' };

	/** de que equipa se vê a lista dos últimos jogos — a da casa, à partida, como nas apps */
	let deQuem = $state<Lado>('casa');
	const daLista = $derived(p[deQuem]);
	const epoca = $derived(linhasDaEpoca(p));
	const contagens = $derived(linhasDasContagens(p));
	const confrontos = $derived(resumoDosConfrontos(p));
	const emCurso = $derived({ casa: sequenciasEmCurso(p.casa), fora: sequenciasEmCurso(p.fora) });
	const periodos = $derived({ marcados: linhasDosPeriodos(p, 'marcados'), sofridos: linhasDosPeriodos(p, 'sofridos') });
	const disciplina = $derived(linhasDaDisciplina(p));
	const treinadores = $derived(treinadoresDoJogo(p));
</script>

{#snippet bolas(lado: Lado)}
	{@const e = p[lado]}
	{@const bolas = bolasDaForma(e)}
	<div class="forma">
		<Emblema equipa={e.equipa} src={emblemas[e.equipa]} tamanho={22} />
		<span class="nome">{e.equipa}</span>
		<span class="bolas" aria-label="Últimos jogos, do mais antigo para o mais recente: {bolas.map((r) => NOME[r]).join(', ') || 'nenhum'}">
			{#each bolas as r, i (i)}
				<i class="r {r}" aria-hidden="true">{r}</i>
			{/each}
		</span>
	</div>
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

<section>
	<h2>Forma recente</h2>
	<div class="cartao">
		{@render bolas('casa')}
		{@render bolas('fora')}
	</div>

	<div class="escolha" role="group" aria-label="Últimos jogos de qual equipa">
		{#each ['casa', 'fora'] as const as lado (lado)}
			<button type="button" aria-pressed={deQuem === lado} onclick={() => (deQuem = lado)}>
				<Emblema equipa={p[lado].equipa} src={emblemas[p[lado].equipa]} tamanho={18} />
				<span>{p[lado].equipa}</span>
			</button>
		{/each}
	</div>
	{#if daLista.ultimos.length}
		<ul class="cartao jogos">
			{#each jogosDaForma(daLista) as j (j.id)}
				{@const r = resultadoDe(j)}
				<li>
					<a href="/jogo/{j.id}">
						<span class="quando">{diaCurto(j.data)}{#if outraProva(j, comp)}<small>{outraProva(j, comp)}</small>{/if}</span>
						<span class="contra">
							<small class="onde">{j.em_casa ? 'Casa' : 'Fora'}</small>
							<Emblema equipa={j.adversario} src={emblemas[j.adversario]} tamanho={18} />
							<span class="nome">{j.adversario}</span>
						</span>
						<span class="res">{j.marcados}–{j.sofridos}</span>
						<i class="r {r}" aria-label={NOME[r]}>{r}</i>
					</a>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="nada">{daLista.equipa} ainda não jogou esta época.</p>
	{/if}
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
	section > .escolha + .cartao { border-top: 0; padding-top: 0; }
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

	/* as bolas de resultado: verde, cinzento, vermelho, com a letra para quem não vê cores */
	.r {
		display: inline-grid;
		place-items: center;
		flex: none;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		font-style: normal;
		font-size: var(--t-micro);
		font-weight: 700;
		/* a cor do cartão e não branco: no tema escuro as cores de ganhar e perder são claras,
		   e o branco por cima delas não se lia */
		color: var(--cartao);
	}
	.r.V { background: var(--ganha); }
	.r.E { background: var(--suave); }
	.r.D { background: var(--perde); }

	.forma {
		display: flex;
		align-items: center;
		gap: var(--e-3);
		min-height: 44px;
		font-size: var(--t-base);
	}
	.forma + .forma { border-top: 1px solid var(--borda-fraca); }
	.forma .nome { flex: 1; }
	.bolas { display: flex; gap: var(--e-1); }

	.escolha {
		display: flex;
		gap: var(--e-2);
		margin: var(--e-3) 0;
	}
	.escolha button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--e-2);
		flex: 1;
		min-width: 0;
		min-height: 40px;
		padding: 0 var(--e-3);
		border: 1px solid var(--borda);
		border-radius: var(--raio-pilula);
		background: var(--cartao);
		color: var(--texto-2);
		font: inherit;
		font-size: var(--t-pequeno);
		cursor: pointer;
	}
	.escolha button span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.escolha button[aria-pressed='true'] {
		border-color: var(--acento);
		background: var(--acento-fraco);
		color: var(--texto);
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
	.contra { display: flex; align-items: center; gap: var(--e-2); min-width: 0; }
	.onde {
		flex: none;
		width: 2.2rem;
		display: inline;
	}
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
