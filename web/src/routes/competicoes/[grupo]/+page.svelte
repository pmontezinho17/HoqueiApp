<script lang="ts">
	import Emblema from '$lib/Emblema.svelte';
	import LinhaJogo from '$lib/LinhaJogo.svelte';
	import { favoritos } from '$lib/favoritos.svelte';
	import { jornadaAtual, porQuando, nomeProprio } from '$lib/formato';
	import { caminhoEquipa } from '$lib/slug';
	import type { Jogo, TotaisJogador } from '$lib/tipos';

	let { data } = $props();

	type Aba = 'classificacao' | 'calendario' | 'marcadores';
	let aba = $state<Aba>('classificacao');

	// modo de vista ao estilo dos modos da NHL: os mesmos dados reagrupados.
	// `Escalão` empilha as séries — nunca as funde, porque não se enfrentam.
	let soMinhaSerie = $state(false);
	const temSeries = $derived(data.provas.length > 1);

	const minhasEquipas = $derived(new Set(favoritos.lista.map((f) => f.equipa)));
	const minhaSerie = $derived(
		data.provas.find((p) =>
			p.dados.equipas.some((e: { nome: string }) => minhasEquipas.has(e.nome))
		)
	);
	const visiveis = $derived(
		soMinhaSerie && minhaSerie ? [minhaSerie] : data.provas
	);

	const destaque = (equipa: string) => minhasEquipas.has(equipa);

	// marcadores: somados entre séries, com a série ao lado de cada jogador, porque
	// as séries não se enfrentam e um ranking sem isso seria enganador
	const marcadores = $derived.by(() => {
		const linhas: (TotaisJogador & { serie: string | null })[] = [];
		for (const p of visiveis)
			for (const j of p.quadro?.jogadores ?? [])
				linhas.push({ ...j, serie: p.competicao.serie ?? null });
		return linhas.sort((a, b) => b.golos - a.golos || b.assistencias - a.assistencias).slice(0, 40);
	});

	const jogosDaProva = (jogos: Jogo[]) => {
		const atual = jornadaAtual(jogos);
		const m = new Map<string, Jogo[]>();
		for (const j of porQuando(jogos)) (m.get(j.jornada) ?? m.set(j.jornada, []).get(j.jornada)!).push(j);
		return { atual, jornadas: [...m] };
	};

	const paraAgenda = (j: Jogo, comp: number, cat: string) => ({
		id: j.id, data: j.data ?? '', hora: j.hora ? j.hora.slice(0, 5) : null,
		casa: j.casa, fora: j.fora, gc: j.golos_casa, gf: j.golos_fora,
		recinto: j.recinto, comp, prova: '', cat
	});
</script>

<svelte:head><title>{data.grupoNome} — Hóquei em Patins</title></svelte:head>

<header class="titulo">
	<p class="escalao">{data.escalao}</p>
	<h1>{data.grupoNome}</h1>
	{#if temSeries}
		<p class="quantas">{data.provas.length} séries</p>
	{/if}
</header>

<div class="abas" role="tablist">
	<button role="tab" aria-selected={aba === 'classificacao'} onclick={() => (aba = 'classificacao')}>Classificação</button>
	<button role="tab" aria-selected={aba === 'calendario'} onclick={() => (aba = 'calendario')}>Calendário</button>
	<button role="tab" aria-selected={aba === 'marcadores'} onclick={() => (aba = 'marcadores')}>Marcadores</button>
</div>

{#if temSeries && minhaSerie}
	<div class="modos" role="group" aria-label="Vista">
		<button class:activo={!soMinhaSerie} onclick={() => (soMinhaSerie = false)}>Todas as séries</button>
		<button class:activo={soMinhaSerie} onclick={() => (soMinhaSerie = true)}>
			Só a série {minhaSerie.competicao.serie}
		</button>
	</div>
{/if}

{#if aba === 'classificacao'}
	{#each visiveis as p (p.competicao.id)}
		{#each p.dados.classificacao as grupo, i (grupo.nome ?? i)}
			<section>
				<h2>{p.competicao.serie ? `Série ${p.competicao.serie}` : (grupo.nome ?? 'Classificação')}</h2>
				<table>
					<thead>
						<tr>
							<th class="p">#</th><th class="eq">Equipa</th>
							<th><abbr title="Jogos">J</abbr></th>
							<th><abbr title="Diferença de golos">DG</abbr></th>
							<th class="pts">P</th>
						</tr>
					</thead>
					<tbody>
						{#each grupo.linhas as l (l.equipa)}
							<tr class:minha={destaque(l.equipa)}>
								<td class="p">{l.posicao}</td>
								<th class="eq">
									<Emblema equipa={l.equipa} src={data.emblemas[l.equipa]} tamanho={18} />{l.equipa}
								</th>
								<td>{l.jogos}</td>
								<td class:pos={l.diferenca > 0} class:neg={l.diferenca < 0}>
									{l.diferenca > 0 ? '+' : ''}{l.diferenca}
								</td>
								<td class="pts">{l.pontos}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</section>
		{/each}
	{/each}
	<p class="nota">Vitória 3 pontos, empate 1. As séries não se enfrentam, por isso não há tabela única.</p>
{:else if aba === 'calendario'}
	{#each visiveis as p (p.competicao.id)}
		{@const cal = jogosDaProva(p.dados.jogos)}
		<section>
			{#if p.competicao.serie}<h2>Série {p.competicao.serie}</h2>{/if}
			{#each cal.jornadas as [jornada, jogos] (jornada)}
				<p class="jornada" class:curso={jornada === cal.atual}>
					{jornada}{#if jornada === cal.atual}<span class="agora">em curso</span>{/if}
				</p>
				{#each jogos as j (j.id ?? `${j.casa}${j.fora}`)}
					<LinhaJogo jogo={paraAgenda(j, p.competicao.id, data.escalao)}
						emblemas={data.emblemas} seguida={destaque} comData />
				{/each}
			{/each}
		</section>
	{/each}
{:else}
	{#if marcadores.length === 0}
		<p class="nota">Ainda não há fichas de jogo publicadas nesta competição.</p>
	{:else}
		<ol class="marcadores">
			{#each marcadores as m, i (m.equipa + m.nome)}
				<li class:minha={destaque(m.equipa)}>
					<span class="lugar">{i + 1}</span>
					<span class="quem">
						<span class="nome">{nomeProprio(m.nome)}</span>
						<span class="clube">
							{m.equipa}{#if m.serie}<span class="ser">série {m.serie}</span>{/if}
						</span>
					</span>
					<span class="numeros"><b>{m.golos}</b><span>{m.assistencias}A · {m.jogos}j</span></span>
				</li>
			{/each}
		</ol>
		{#if temSeries && !soMinhaSerie}
			<p class="nota">
				Somado entre séries. Como as séries não se enfrentam, os totais não são
				directamente comparáveis — a série de cada jogador está indicada.
			</p>
		{/if}
	{/if}
{/if}

<style>
	.titulo { margin-bottom: 0.8rem; }
	.escalao { font-size: 0.64rem; color: var(--acento); letter-spacing: 0.05em; margin: 0; }
	h1 { font-size: 1rem; margin: 0.1rem 0 0; }
	.quantas { font-size: 0.7rem; color: var(--suave); margin: 0.15rem 0 0; }

	.abas { display: flex; gap: 0.25rem; margin-bottom: 0.7rem; }
	.abas button { flex: 1; min-height: 40px; font-size: 0.78rem; cursor: pointer;
		border-radius: 8px; border: 1px solid var(--borda);
		background: var(--cartao); color: var(--suave); }
	.abas button[aria-selected='true'] { color: var(--acento); border-color: var(--acento); font-weight: 600; }

	.modos { display: flex; gap: 0.25rem; margin-bottom: 0.8rem; }
	.modos button { flex: 1; min-height: 34px; font-size: 0.72rem; cursor: pointer;
		border-radius: 999px; border: 1px solid var(--borda);
		background: none; color: var(--suave); }
	.modos button.activo { border-color: var(--acento); color: var(--acento); font-weight: 600; }

	section { margin-bottom: 1.2rem; }
	h2 { font-size: 0.7rem; color: var(--suave); margin: 0 0 0.3rem; font-weight: 600; }

	/* vista simples por omissão: 5 colunas cabem a 375px sem rolar (W6.2) */
	table { width: 100%; border-collapse: collapse; font-size: 0.76rem;
		font-variant-numeric: tabular-nums; }
	th, td { padding: 0.4rem 0.25rem; text-align: right; }
	thead th { font-size: 0.64rem; color: var(--suave); font-weight: 600;
		border-bottom: 1px solid var(--borda); }
	abbr { text-decoration: none; }
	.p { width: 1.4rem; text-align: center; color: var(--suave); }
	.eq { text-align: left; width: 100%; font-weight: 400; display: flex;
		align-items: center; gap: 0.35rem; }
	.pts { font-weight: 700; }
	tbody tr + tr th, tbody tr + tr td { border-top: 1px solid var(--borda); }
	tbody tr.minha { background: var(--acento-fraco); }
	.pos { color: var(--acento); }
	.neg { color: var(--suave); }

	.jornada { font-size: 0.66rem; color: var(--suave); margin: 0.6rem 0 0.1rem 0.2rem; }
	.jornada.curso { color: var(--acento); }
	.agora { margin-left: 0.35rem; padding: 0.02rem 0.3rem; border-radius: 999px;
		background: var(--acento); color: var(--cartao); font-size: 0.6rem; }

	.marcadores { list-style: none; margin: 0; padding: 0; }
	.marcadores li { display: grid; grid-template-columns: 1.6rem 1fr auto;
		align-items: center; gap: 0.5rem; padding: 0.45rem 0.2rem;
		border-bottom: 1px solid var(--borda); }
	.marcadores li.minha { background: var(--acento-fraco); }
	.lugar { text-align: center; color: var(--suave); font-size: 0.72rem; }
	.quem { min-width: 0; }
	.nome { display: block; font-size: 0.8rem; overflow: hidden;
		text-overflow: ellipsis; white-space: nowrap; }
	.clube { display: block; font-size: 0.66rem; color: var(--suave); }
	.ser { margin-left: 0.3rem; }
	.numeros { text-align: right; }
	.numeros b { display: block; font-size: 0.92rem; font-variant-numeric: tabular-nums; }
	.numeros span { font-size: 0.62rem; color: var(--suave); }

	.nota { color: var(--suave); font-size: 0.7rem; margin-top: 0.7rem; }
</style>
