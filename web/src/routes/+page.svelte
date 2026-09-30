<script lang="ts">
	import FitaDatas from '$lib/FitaDatas.svelte';
	import LinhaJogo from '$lib/LinhaJogo.svelte';
	import { favoritos } from '$lib/favoritos.svelte';
	import { dataLonga } from '$lib/formato';
	import type { JogoAgenda } from '$lib/tipos';

	let { data } = $props();

	const hoje = new Date().toISOString().slice(0, 10);
	// janela em torno de hoje: a época toda dava 52 fichas de data, que não se navega
	const JANELA_ATRAS = 10, JANELA_FRENTE = 35;
	const limite = (dias: number) =>
		new Date(Date.now() + dias * 864e5).toISOString().slice(0, 10);
	const dias = $derived(
		([...new Set(data.agenda.map((j: JogoAgenda) => j.data))] as string[])
			.filter((d) => d >= limite(-JANELA_ATRAS) && d <= limite(JANELA_FRENTE))
			.sort()
	);
	// abre no dia com jogos mais próximo de hoje, para frente
	let dia = $state('');
	$effect(() => {
		if (!dia) dia = dias.find((d) => d >= hoje) ?? dias.at(-1) ?? '';
	});

	let escalao = $state<string | null>(null);
	const ORDEM = ['SENIORES MASCULINOS', 'SENIORES FEMININOS', 'SUB-23', 'SUB-19',
		'SUB-17', 'SUB-15', 'SUB-13', 'ESCOLARES', 'BENJAMINS', 'BAMBIS'];

	// seguir é por clube E escalão
	const chave = (e: string, c: string) => `${c}\u0000${e}`;
	const seguidas = $derived(new Set(favoritos.lista.map((f) => chave(f.equipa, f.categoria))));
	const doDia = $derived(data.agenda.filter((j: JogoAgenda) => j.data === dia));
	const minhas = $derived(
		doDia.filter((j: JogoAgenda) => seguidas.has(chave(j.casa, j.cat)) || seguidas.has(chave(j.fora, j.cat)))
	);

	const escaloes = $derived.by(() => {
		const vistos = [...new Set(doDia.map((j: JogoAgenda) => j.cat))] as string[];
		return vistos.sort((a, b) => {
			const ia = ORDEM.indexOf(a), ib = ORDEM.indexOf(b);
			return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
		});
	});

	/** Agrupa: competição → série. A competição fica no cabeçalho, não em cada linha. */
	const secoes = $derived.by(() => {
		const filtrados = escalao ? doDia.filter((j: JogoAgenda) => j.cat === escalao) : doDia;
		const porGrupo = new Map<string, { nome: string; cat: string; series: Map<string, JogoAgenda[]> }>();
		for (const j of filtrados) {
			const gid = j.grupo_id ?? String(j.comp);
			const g = porGrupo.get(gid) ?? porGrupo.set(gid, {
				nome: j.grupo_nome ?? j.prova, cat: j.cat, series: new Map()
			}).get(gid)!;
			const s = j.serie ?? '';
			(g.series.get(s) ?? g.series.set(s, []).get(s)!).push(j);
		}
		return [...porGrupo].map(([id, g]) => ({
			id, ...g,
			series: [...g.series].sort((a, b) => a[0].localeCompare(b[0])),
			total: [...g.series.values()].reduce((n, l) => n + l.length, 0)
		}));
	});

	// secções fechadas quando o dia é grande: um sábado tem 41 jogos
	let fechadas = $state(new Set<string>());
	$effect(() => {
		fechadas = doDia.length > 12 ? new Set(secoes.map((s) => s.id)) : new Set();
	});
	const alternar = (id: string) => {
		const n = new Set(fechadas);
		n.has(id) ? n.delete(id) : n.add(id);
		fechadas = n;
	};

	const eSeguida = (cat: string) => (equipa: string) => seguidas.has(chave(equipa, cat));
</script>

<svelte:head><title>Jogos — Hóquei em Patins</title></svelte:head>

<FitaDatas {dias} bind:escolhido={dia} />

{#if escaloes.length > 1}
	<div class="escaloes" role="group" aria-label="Filtrar por escalão">
		<button class:activo={escalao === null} onclick={() => (escalao = null)}>Todos</button>
		{#each escaloes as e (e)}
			<button class:activo={escalao === e} onclick={() => (escalao = escalao === e ? null : e)}>
				{e.replace('SENIORES ', 'SEN. ')}
			</button>
		{/each}
	</div>
{/if}

{#if doDia.length === 0}
	<p class="vazio">Sem jogos em {dataLonga(dia)}.</p>
{:else}
	{#if minhas.length}
		<section class="destacada">
			<h2>As minhas equipas</h2>
			{#each minhas as j (j.id ?? `${j.casa}${j.fora}`)}
				<LinhaJogo jogo={j} emblemas={data.emblemas} seguida={eSeguida(j.cat)} />
			{/each}
		</section>
	{/if}

	{#each secoes as s (s.id)}
		<section>
			<button class="cabecalho" onclick={() => alternar(s.id)} aria-expanded={!fechadas.has(s.id)}>
				<span class="escalao">{s.cat}</span>
				<span class="prova">{s.nome}</span>
				<span class="conta">{s.total}</span>
				<span class="chevron" class:fechado={fechadas.has(s.id)} aria-hidden="true">⌃</span>
			</button>
			{#if !fechadas.has(s.id)}
				{#each s.series as [serie, jogos] (serie)}
					{#if serie}<p class="serie">Série {serie}</p>{/if}
					{#each jogos as j (j.id ?? `${j.casa}${j.fora}`)}
						<LinhaJogo jogo={j} emblemas={data.emblemas} seguida={eSeguida(j.cat)} />
					{/each}
				{/each}
			{/if}
		</section>
	{/each}
{/if}

<style>
	.escaloes { display: flex; gap: 0.25rem; overflow-x: auto; scrollbar-width: none;
		margin: 0 -0.9rem 0.7rem; padding: 0 0.9rem 0.2rem; }
	.escaloes::-webkit-scrollbar { display: none; }
	.escaloes button { flex: 0 0 auto; min-height: 32px; padding: 0.25rem 0.6rem;
		font-size: 0.72rem; white-space: nowrap; cursor: pointer; border-radius: 999px;
		border: 1px solid var(--borda); background: var(--cartao); color: var(--suave); }
	.escaloes button.activo { border-color: var(--acento); color: var(--acento); font-weight: 600; }

	section { margin-bottom: 1.1rem; }
	.destacada { border-left: 2px solid var(--acento); padding-left: 0.6rem; }
	.destacada h2 { font-size: 0.72rem; color: var(--acento); margin: 0 0 0.2rem;
		font-weight: 600; }

	/* cabeçalho discreto: peso normal, sem maiúsculas, como a referência */
	.cabecalho {
		display: grid; grid-template-columns: 1fr auto auto; align-items: baseline;
		gap: 0 0.5rem; width: 100%; text-align: left; cursor: pointer;
		padding: 0.45rem 0.2rem; background: none; border: 0;
		border-bottom: 1px solid var(--borda); color: inherit;
	}
	.escalao { grid-column: 1; font-size: 0.64rem; color: var(--acento);
		letter-spacing: 0.04em; }
	.prova { grid-column: 1; font-size: 0.82rem; overflow: hidden;
		text-overflow: ellipsis; white-space: nowrap; }
	/* coluna explícita: sem ela a auto-colocação punha o contador na 1ª coluna,
	   acima do escalão */
	.conta { grid-column: 2; grid-row: 1 / 3; align-self: center; color: var(--suave);
		font-size: 0.72rem; font-variant-numeric: tabular-nums; }
	.chevron { grid-column: 3; grid-row: 1 / 3; align-self: center; color: var(--suave);
		font-size: 0.7rem; transition: transform 0.15s; }
	.chevron.fechado { transform: rotate(180deg); }
	@media (prefers-reduced-motion: reduce) { .chevron { transition: none; } }

	.serie { font-size: 0.66rem; color: var(--suave); margin: 0.45rem 0 0.1rem 0.2rem; }
	.vazio { color: var(--suave); font-size: 0.82rem; }
</style>
