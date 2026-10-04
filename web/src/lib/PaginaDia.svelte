<script lang="ts">
	/**
	 * Os jogos de **um** dia: as equipas seguidas em destaque e depois as secções por
	 * competição.
	 *
	 * Vive num componente próprio por causa da faixa que se arrasta: estão três dias
	 * montados ao mesmo tempo, e o estado "que secções estão fechadas" é de cada dia. Com
	 * isto tudo em `+page.svelte` seria um `Record<dia, Set<id>>` à mão — aqui é só estado
	 * local que nasce e morre com a página.
	 */
	import LinhaJogo from './LinhaJogo.svelte';
	import { dataLonga, nomeProva } from './formato';
	import type { JogoAgenda } from './tipos';

	let {
		dia,
		jogos,
		emblemas,
		eSeguida,
		escalao = null
	}: {
		dia: string;
		jogos: JogoAgenda[];
		emblemas: Record<string, string>;
		eSeguida: (cat: string) => (equipa: string) => boolean;
		/** o escalão escolhido nos chips, ou `null` para todos */
		escalao?: string | null;
	} = $props();

	const seguida = (j: JogoAgenda) => eSeguida(j.cat)(j.casa) || eSeguida(j.cat)(j.fora);
	const minhas = $derived(jogos.filter(seguida));

	/**
	 * Filtra pelo escalão escolhido — mas só se este dia o tiver. Ao arrastar para um dia
	 * sem sub-13, filtrar por sub-13 daria uma página vazia a meio do gesto; mostrar tudo
	 * é o comportamento indulgente, e o chip volta a "Todos" quando o dia assenta.
	 */
	const filtrados = $derived(
		escalao && jogos.some((j) => j.cat === escalao)
			? jogos.filter((j) => j.cat === escalao)
			: jogos
	);

	/** Agrupa: competição → série. A competição fica no cabeçalho, não em cada linha. */
	const secoes = $derived.by(() => {
		const porGrupo = new Map<
			string,
			{ nome: string; cat: string; series: Map<string, JogoAgenda[]> }
		>();
		for (const j of filtrados) {
			const gid = j.grupo_id ?? String(j.comp);
			const g =
				porGrupo.get(gid) ??
				porGrupo
					.set(gid, { nome: j.grupo_nome ?? j.prova, cat: j.cat, series: new Map() })
					.get(gid)!;
			const s = j.serie ?? '';
			(g.series.get(s) ?? g.series.set(s, []).get(s)!).push(j);
		}
		return [...porGrupo].map(([id, g]) => ({
			id,
			...g,
			series: [...g.series].sort((a, b) => a[0].localeCompare(b[0])),
			total: [...g.series.values()].reduce((n, l) => n + l.length, 0)
		}));
	});

	// secções fechadas quando o dia é grande: um sábado tem 41 jogos
	let fechadas = $state(new Set<string>());
	$effect(() => {
		fechadas = jogos.length > 12 ? new Set(secoes.map((s) => s.id)) : new Set();
	});
	const alternar = (id: string) => {
		const n = new Set(fechadas);
		n.has(id) ? n.delete(id) : n.add(id);
		fechadas = n;
	};
</script>

{#if jogos.length === 0}
	<p class="vazio">Sem jogos em {dataLonga(dia)}.</p>
{:else}
	{#if minhas.length}
		<section class="destacada">
			<h2>As minhas equipas</h2>
			{#each minhas as j (j.id ?? `${j.casa}${j.fora}`)}
				<LinhaJogo jogo={j} {emblemas} seguida={eSeguida(j.cat)} comEscalao />
			{/each}
		</section>
	{/if}

	{#each secoes as s (s.id)}
		<section>
			<button
				class="cabecalho"
				onclick={() => alternar(s.id)}
				aria-expanded={!fechadas.has(s.id)}
			>
				<span class="escalao">{s.cat}</span>
				<span class="prova">{nomeProva(s.nome)}</span>
				<span class="conta">{s.total}</span>
				<span class="chevron" class:fechado={fechadas.has(s.id)} aria-hidden="true">⌃</span>
			</button>
			{#if !fechadas.has(s.id)}
				{#each s.series as [serie, jogos] (serie)}
					{#if serie}<p class="serie">Série {serie}</p>{/if}
					{#each jogos as j (j.id ?? `${j.casa}${j.fora}`)}
						<LinhaJogo jogo={j} {emblemas} seguida={eSeguida(j.cat)} />
					{/each}
				{/each}
			{/if}
		</section>
	{/each}
{/if}

<style>
	section {
		margin-bottom: var(--e-6);
	}
	.destacada {
		border-left: 2px solid var(--acento);
		padding-left: var(--e-4);
	}
	.destacada h2 {
		font-size: var(--t-micro);
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--acento);
		margin: 0 0 var(--e-2);
		font-weight: 600;
	}

	/*
	  O cabeçalho da secção **recua atrás do conteúdo**, e isto era o contrário.
	  O nome da prova estava a 0.82rem e os nomes das equipas a 0.75rem: o rótulo da
	  competição era maior do que os jogos, que é o que se vem aqui ver. Agora a prova é um
	  degrau abaixo das equipas e em texto secundário; o escalão fica no degrau mais pequeno.
	*/
	.cabecalho {
		display: grid;
		grid-template-columns: 1fr auto auto;
		align-items: baseline;
		gap: 0 var(--e-3);
		width: 100%;
		text-align: left;
		cursor: pointer;
		padding: var(--e-4) var(--e-1) var(--e-2);
		background: none;
		border: 0;
		border-bottom: 1px solid var(--borda);
		color: inherit;
	}
	.escalao {
		grid-column: 1;
		font-size: var(--t-micro);
		font-weight: 600;
		color: var(--acento);
		letter-spacing: 0.05em;
	}
	.prova {
		grid-column: 1;
		font-size: var(--t-pequeno);
		color: var(--texto-2);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	/* coluna explícita: sem ela a auto-colocação punha o contador na 1ª coluna,
	   acima do escalão */
	.conta {
		grid-column: 2;
		grid-row: 1 / 3;
		align-self: center;
		color: var(--suave);
		font-size: var(--t-pequeno);
		font-variant-numeric: tabular-nums;
	}
	.chevron {
		grid-column: 3;
		grid-row: 1 / 3;
		align-self: center;
		color: var(--suave);
		font-size: var(--t-pequeno);
		transition: transform 0.15s;
	}
	.chevron.fechado {
		transform: rotate(180deg);
	}
	@media (prefers-reduced-motion: reduce) {
		.chevron {
			transition: none;
		}
	}

	.serie {
		font-size: var(--t-micro);
		letter-spacing: 0.04em;
		color: var(--suave);
		margin: var(--e-4) 0 var(--e-0) var(--e-1);
	}
	.vazio {
		color: var(--suave);
		font-size: var(--t-base);
	}
</style>
