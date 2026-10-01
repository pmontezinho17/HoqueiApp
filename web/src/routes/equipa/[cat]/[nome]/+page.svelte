<script lang="ts">
	import CalendarioMes from '$lib/CalendarioMes.svelte';
	import Emblema from '$lib/Emblema.svelte';
	import FormaRecente from '$lib/FormaRecente.svelte';
	import LinhaJogo from '$lib/LinhaJogo.svelte';
	import { favoritos } from '$lib/favoritos.svelte';
	import { porQuando } from '$lib/formato';
	import { disputado, type Jogo, type TotaisJogador } from '$lib/tipos';

	let { data } = $props();

	type Aba = 'resumo' | 'jogos' | 'classificacao' | 'plantel';
	let aba = $state<Aba>('resumo');
	let vistaJogos = $state<'lista' | 'calendario'>('lista');

	const hoje = new Date().toISOString().slice(0, 10);
	const segue = $derived(favoritos.segue(data.equipa, data.categoria));

	/** Todos os jogos da equipa, de todas as provas do escalão. */
	const jogos = $derived(
		porQuando(
			data.provas
				.flatMap((p) => p.dados.jogos)
				.filter((j: Jogo) => j.casa === data.equipa || j.fora === data.equipa)
		)
	);
	const proximos = $derived(jogos.filter((j: Jogo) => !disputado(j) && (j.data ?? '') >= hoje));
	const anteriores = $derived([...jogos.filter(disputado)].reverse());

	/** Posição em cada prova/série do escalão. */
	const posicoes = $derived(
		data.provas.flatMap((p) =>
			p.dados.classificacao.flatMap((g) =>
				g.linhas
					.filter((l) => l.equipa === data.equipa)
					.map((l) => ({ prova: p.dados.competicao, grupo: g.nome, linha: l }))
			)
		)
	);

	/** Plantel: quem alinhou, somado entre as provas do escalão. */
	const plantel = $derived.by(() => {
		const por = new Map<string, TotaisJogador & { numero?: string | null }>();
		for (const p of data.provas)
			for (const j of p.quadro?.jogadores ?? []) {
				if (j.equipa !== data.equipa) continue;
				const a = por.get(j.nome);
				if (!a) por.set(j.nome, { ...j });
				else {
					a.jogos += j.jogos; a.golos += j.golos;
					a.assistencias += j.assistencias; a.defesas += j.defesas;
				}
			}
		return [...por.values()].sort(
			(a, b) => b.golos - a.golos || b.assistencias - a.assistencias || a.nome.localeCompare(b.nome)
		);
	});

	/** Recinto onde joga em casa: o mais frequente dos jogos em casa. */
	const recinto = $derived.by(() => {
		const c = new Map<string, number>();
		for (const j of jogos)
			if (j.casa === data.equipa && j.recinto) c.set(j.recinto, (c.get(j.recinto) ?? 0) + 1);
		return [...c].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
	});

	const totais = $derived.by(() => {
		const d = jogos.filter(disputado);
		let gm = 0, gs = 0;
		for (const j of d) {
			const casa = j.casa === data.equipa;
			gm += (casa ? j.golos_casa : j.golos_fora) ?? 0;
			gs += (casa ? j.golos_fora : j.golos_casa) ?? 0;
		}
		return { jogos: d.length, gm, gs, assistencias: plantel.reduce((n, p) => n + p.assistencias, 0) };
	});

	const paraAgenda = (j: Jogo) => ({
		id: j.id, data: j.data ?? '', hora: j.hora ? j.hora.slice(0, 5) : null,
		casa: j.casa, fora: j.fora, gc: j.golos_casa, gf: j.golos_fora,
		recinto: j.recinto, comp: data.provas[0]?.id ?? 0, prova: '', cat: data.categoria
	});
	const destaque = (e: string) => e === data.equipa;
</script>

<svelte:head><title>{data.equipa} {data.categoria} — Hóquei em Patins</title></svelte:head>

<header class="topo">
	<Emblema equipa={data.equipa} src={data.emblemas[data.equipa]} tamanho={40} />
	<div class="quem">
		<h1>{data.equipa}</h1>
		<p class="escalao">{data.categoria}</p>
	</div>
	<button
		class="seguir" class:activo={segue}
		onclick={() => favoritos.alternar(data.equipa, data.categoria, data.provas.map((p) => p.id))}
	>{segue ? '✓ A seguir' : '+ Seguir'}</button>
</header>

<div class="abas" role="tablist">
	{#each [['resumo', 'Resumo'], ['jogos', 'Jogos'], ['classificacao', 'Classificação'], ['plantel', 'Plantel']] as const as [k, r] (k)}
		<button role="tab" aria-selected={aba === k} onclick={() => (aba = k as Aba)}>{r}</button>
	{/each}
</div>

{#if aba === 'resumo'}
	<FormaRecente {jogos} equipa={data.equipa} emblemas={data.emblemas} />

	{#if proximos.length}
		<p class="rotulo">Próximo jogo</p>
		<LinhaJogo jogo={paraAgenda(proximos[0])} emblemas={data.emblemas} seguida={destaque} comData />
	{/if}
	{#if anteriores.length}
		<p class="rotulo">Último resultado</p>
		<LinhaJogo jogo={paraAgenda(anteriores[0])} emblemas={data.emblemas} seguida={destaque} comData />
	{/if}

	<p class="rotulo">Esta época</p>
	<dl class="numeros">
		<dt>Jogos</dt><dd>{totais.jogos}</dd>
		<dt>Golos marcados</dt><dd>{totais.gm}</dd>
		<dt>Golos sofridos</dt><dd>{totais.gs}</dd>
		<dt>Assistências</dt><dd>{totais.assistencias}</dd>
		{#if recinto}<dt>Joga em casa</dt><dd class="txt">{recinto}</dd>{/if}
	</dl>
{:else if aba === 'jogos'}
	<div class="vistas" role="tablist">
		<button role="tab" aria-selected={vistaJogos === 'lista'} onclick={() => (vistaJogos = 'lista')}>Lista</button>
		<button role="tab" aria-selected={vistaJogos === 'calendario'} onclick={() => (vistaJogos = 'calendario')}>Calendário</button>
	</div>

	{#if vistaJogos === 'calendario'}
		<CalendarioMes {jogos} equipa={data.equipa} emblemas={data.emblemas} />
	{:else}
	{#if proximos.length}
		<p class="rotulo">Por disputar</p>
		{#each proximos as j (j.id ?? `${j.casa}${j.fora}`)}
			<LinhaJogo jogo={paraAgenda(j)} emblemas={data.emblemas} seguida={destaque} comData />
		{/each}
	{/if}
	{#if anteriores.length}
		<p class="rotulo">Resultados</p>
		{#each anteriores as j (j.id ?? `${j.casa}${j.fora}`)}
			<LinhaJogo jogo={paraAgenda(j)} emblemas={data.emblemas} seguida={destaque} comData />
		{/each}
	{/if}
	{/if}
{:else if aba === 'classificacao'}
	{#each posicoes as p (p.prova.id + (p.grupo ?? ''))}
		<section>
			<p class="rotulo">{p.prova.grupo_nome ?? p.prova.nome}{p.prova.serie ? ` · Série ${p.prova.serie}` : ''}</p>
			<a class="posicao" href={`/competicoes/${p.prova.grupo_id ?? p.prova.id}`}>
				<span class="lugar">{p.linha.posicao}º</span>
				<span class="detalhe">
					{p.linha.jogos} jogos · {p.linha.vitorias}V {p.linha.empates}E {p.linha.derrotas}D
					· {p.linha.golos_marcados}–{p.linha.golos_sofridos}
				</span>
				<span class="pts">{p.linha.pontos} pts</span>
			</a>
		</section>
	{:else}
		<p class="vazio">Esta equipa não tem classificação publicada.</p>
	{/each}
{:else}
	{#if plantel.length === 0}
		<p class="vazio">Ainda não há fichas de jogo publicadas para esta equipa.</p>
	{:else}
		<ol class="plantel">
			{#each plantel as j (j.nome)}
				<li>
					<span class="num">{j.numero ?? ''}</span>
					<span class="nome">{j.nome}</span>
					<span class="stats">
						{#if j.golos}<b>{j.golos}G</b>{/if}
						{#if j.assistencias}<span>{j.assistencias}A</span>{/if}
						{#if j.defesas}<span>{j.defesas}D</span>{/if}
						<span class="j">{j.jogos}j</span>
					</span>
				</li>
			{/each}
		</ol>
	{/if}
{/if}

<style>
	.topo { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.9rem; }
	.quem { flex: 1; min-width: 0; }
	h1 { font-size: 1rem; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.escalao { font-size: 0.66rem; color: var(--acento); margin: 0.1rem 0 0; letter-spacing: 0.04em; }
	.seguir { min-height: 36px; padding: 0.3rem 0.7rem; font-size: 0.72rem; cursor: pointer;
		white-space: nowrap; border-radius: 999px; border: 1px solid var(--borda);
		background: none; color: var(--suave); }
	.seguir.activo { border-color: var(--acento); color: var(--acento); font-weight: 600; }

	.abas { display: flex; gap: 0.2rem; margin-bottom: 0.9rem; overflow-x: auto;
		scrollbar-width: none; }
	.abas::-webkit-scrollbar { display: none; }
	.abas button { flex: 1 0 auto; min-height: 38px; padding: 0 0.6rem; font-size: 0.76rem;
		cursor: pointer; white-space: nowrap; border-radius: 8px;
		border: 1px solid var(--borda); background: var(--cartao); color: var(--suave); }
	.abas button[aria-selected='true'] { color: var(--acento); border-color: var(--acento); font-weight: 600; }

	.vistas { display: flex; gap: 0.25rem; margin-bottom: 0.8rem; }
	.vistas button { flex: 1; min-height: 34px; font-size: 0.74rem; cursor: pointer;
		border-radius: 999px; border: 1px solid var(--borda);
		background: none; color: var(--suave); }
	.vistas button[aria-selected='true'] { border-color: var(--acento); color: var(--acento);
		font-weight: 600; }

	.rotulo { font-size: 0.64rem; text-transform: uppercase; letter-spacing: 0.06em;
		color: var(--suave); margin: 0.9rem 0 0.3rem; }
	.numeros { display: grid; grid-template-columns: 1fr auto; gap: 0; font-size: 0.78rem; margin: 0; }
	.numeros dt { color: var(--suave); padding: 0.35rem 0; border-bottom: 1px solid var(--borda); }
	.numeros dd { margin: 0; text-align: right; font-variant-numeric: tabular-nums;
		padding: 0.35rem 0; border-bottom: 1px solid var(--borda); }
	.numeros dd.txt { font-size: 0.72rem; }

	section { margin-bottom: 0.8rem; }
	.posicao { display: grid; grid-template-columns: auto 1fr auto; align-items: baseline;
		gap: 0.5rem; padding: 0.5rem 0.2rem; text-decoration: none;
		border-bottom: 1px solid var(--borda); }
	.lugar { font-size: 1rem; font-weight: 700; }
	.detalhe { font-size: 0.68rem; color: var(--suave); }
	.pts { font-size: 0.76rem; font-variant-numeric: tabular-nums; }

	.plantel { list-style: none; margin: 0; padding: 0; }
	.plantel li { display: grid; grid-template-columns: 1.6rem 1fr auto; align-items: center;
		gap: 0.5rem; padding: 0.45rem 0.2rem; border-bottom: 1px solid var(--borda); }
	.num { text-align: center; font-size: 0.7rem; color: var(--suave);
		font-variant-numeric: tabular-nums; }
	.nome { font-size: 0.8rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.stats { display: flex; gap: 0.4rem; font-size: 0.7rem; color: var(--suave);
		font-variant-numeric: tabular-nums; }
	.stats b { color: var(--acento); }
	.stats .j { min-width: 1.8rem; text-align: right; }
	.vazio { color: var(--suave); font-size: 0.82rem; }
</style>
