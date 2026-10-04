<script lang="ts">
	/**
	 * Os jogos de **um** dia, num cartão por escalão.
	 *
	 * O agrupamento era por competição, e isso partia os Escolares em dois blocos afastados:
	 * "1ª Fase Nível I" e "1ª Fase Nível II" são duas competições, e apareciam separadas por
	 * um bloco de sub-15 pelo meio. Quem procura os escolares procura *os escolares*. Agora o
	 * cartão é o escalão e os níveis são divisões lá dentro.
	 *
	 * Vive num componente próprio por causa da faixa que se arrasta: estão três dias montados
	 * ao mesmo tempo, e o estado "que blocos estão fechados" é de cada dia.
	 */
	import LinhaJogo from './LinhaJogo.svelte';
	import { dataLonga, nomeProva } from './formato';
	import { porEscalao } from './escaloes';
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
	 * sem sub-13, filtrar por sub-13 daria uma página vazia a meio do gesto; mostrar tudo é
	 * o comportamento indulgente, e o chip volta a "Todos" quando o dia assenta.
	 */
	const filtrados = $derived(
		escalao && jogos.some((j) => j.cat === escalao)
			? jogos.filter((j) => j.cat === escalao)
			: jogos
	);

	/** escalão → competição (o nível) → série → jogos */
	const blocos = $derived.by(() => {
		type Prova = { nome: string; series: Map<string, JogoAgenda[]> };
		const porCat = new Map<string, Map<string, Prova>>();
		for (const j of filtrados) {
			const provas = porCat.get(j.cat) ?? porCat.set(j.cat, new Map()).get(j.cat)!;
			const gid = j.grupo_id ?? String(j.comp);
			const p =
				provas.get(gid) ??
				provas.set(gid, { nome: j.grupo_nome ?? j.prova, series: new Map() }).get(gid)!;
			const s = j.serie ?? '';
			(p.series.get(s) ?? p.series.set(s, []).get(s)!).push(j);
		}
		return [...porCat]
			.sort((a, b) => porEscalao(a[0], b[0]))
			.map(([cat, provas]) => ({
				cat,
				provas: [...provas]
					.map(([id, p]) => ({
						id,
						nome: p.nome,
						series: [...p.series].sort((a, b) => a[0].localeCompare(b[0]))
					}))
					.sort((a, b) => a.nome.localeCompare(b.nome, 'pt')),
				total: [...provas.values()].reduce(
					(n, p) => n + [...p.series.values()].reduce((m, l) => m + l.length, 0),
					0
				)
			}));
	});

	/**
	 * Tudo aberto por omissão. A regra era fechar quando o dia tinha mais de 12 jogos, e
	 * fazia o contrário do que se quer: num sábado cheio — o dia em que mais se usa isto —
	 * abria-se a app e via-se uma lista de títulos, sem um único resultado à vista.
	 */
	let fechadas = $state(new Set<string>());
	const alternar = (cat: string) => {
		const n = new Set(fechadas);
		n.has(cat) ? n.delete(cat) : n.add(cat);
		fechadas = n;
	};
</script>

{#if jogos.length === 0}
	<p class="vazio">Sem jogos em {dataLonga(dia)}.</p>
{:else}
	{#if minhas.length}
		<section class="bloco destacada">
			<h2>As minhas equipas</h2>
			<div class="conteudo">
				{#each minhas as j (j.id ?? `${j.casa}${j.fora}`)}
					<LinhaJogo jogo={j} {emblemas} seguida={eSeguida(j.cat)} comEscalao />
				{/each}
			</div>
		</section>
	{/if}

	{#each blocos as b (b.cat)}
		<section class="bloco">
			<button
				class="cabecalho"
				onclick={() => alternar(b.cat)}
				aria-expanded={!fechadas.has(b.cat)}
			>
				<span class="escalao">{b.cat}</span>
				<span class="conta">{b.total}</span>
				<span class="chevron" class:fechado={fechadas.has(b.cat)} aria-hidden="true">⌃</span>
			</button>
			{#if !fechadas.has(b.cat)}
				<div class="conteudo">
					{#each b.provas as p (p.id)}
						<p class="prova">{nomeProva(p.nome)}</p>
						{#each p.series as [serie, lista] (serie)}
							{#if serie}<p class="serie">Série {serie}</p>{/if}
							{#each lista as j (j.id ?? `${j.casa}${j.fora}`)}
								<LinhaJogo jogo={j} {emblemas} seguida={eSeguida(j.cat)} />
							{/each}
						{/each}
					{/each}
				</div>
			{/if}
		</section>
	{/each}
{/if}

<style>
	.bloco {
		margin-bottom: var(--e-4);
		background: var(--cartao);
		border: 1px solid var(--borda);
		border-radius: var(--raio-cartao);
		/* sem isto os cantos arredondados não cortam a primeira e a última linha */
		overflow: hidden;
	}
	.destacada { border-color: var(--acento); }
	.destacada h2 {
		font-size: var(--t-micro);
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--acento);
		font-weight: 600;
		margin: 0;
		padding: var(--e-4) var(--e-4) var(--e-2);
	}

	.cabecalho {
		display: flex;
		align-items: center;
		gap: var(--e-3);
		width: 100%;
		min-height: 44px;
		text-align: left;
		cursor: pointer;
		padding: var(--e-3) var(--e-4);
		background: none;
		border: 0;
		color: inherit;
	}
	.escalao {
		flex: 1;
		min-width: 0;
		font-size: var(--t-base);
		font-weight: 600;
		letter-spacing: 0.04em;
		color: var(--acento);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.conta {
		color: var(--suave);
		font-size: var(--t-pequeno);
		font-variant-numeric: tabular-nums;
	}
	.chevron {
		color: var(--suave);
		font-size: var(--t-pequeno);
		transition: transform 0.15s;
	}
	.chevron.fechado { transform: rotate(180deg); }
	@media (prefers-reduced-motion: reduce) {
		.chevron { transition: none; }
	}

	/*
	  O recuo do cartão é pequeno de propósito, e as linhas de jogo não levam nenhum: com os
	  12px de cada lado que isto tinha ao princípio, os nomes das equipas perdiam 24px e
	  passavam de "CRIAR-T GD" a "CRIAR-T …". Num cartão, o bordo já separa — não é preciso
	  afastar o conteúdo dele.
	*/
	.conteudo { padding: 0 var(--e-2) var(--e-2); }
	.conteudo :global(.linha) { padding-left: 0; padding-right: 0; }
	/* a última linha não leva separador: o bordo do cartão já separa */
	.conteudo > :global(:last-child) { border-bottom: 0; }

	/* o nível dentro do escalão — é isto que junta "Nível I" e "Nível II" no mesmo cartão */
	.prova {
		font-size: var(--t-pequeno);
		color: var(--texto-2);
		margin: 0;
		padding: var(--e-4) var(--e-1) var(--e-2);
		border-top: 1px solid var(--borda-fraca);
	}
	.conteudo > .prova:first-child {
		padding-top: 0;
		border-top: 0;
	}
	.serie {
		font-size: var(--t-micro);
		letter-spacing: 0.04em;
		color: var(--suave);
		margin: 0;
		padding: var(--e-3) var(--e-1) var(--e-1);
	}
	.vazio {
		color: var(--suave);
		font-size: var(--t-base);
	}
</style>
