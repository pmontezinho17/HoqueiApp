<script lang="ts">
	import CalendarioMes from '$lib/CalendarioMes.svelte';
	import Emblema from '$lib/Emblema.svelte';
	import FormaRecente from '$lib/FormaRecente.svelte';
	import LinhaJogo from '$lib/LinhaJogo.svelte';
	import { favoritos } from '$lib/favoritos.svelte';
	import { porQuando } from '$lib/formato';
	import { caminhoEquipa } from '$lib/slug';
	import { disputado, type Jogo, type TotaisJogador } from '$lib/tipos';

	let { data } = $props();

	type Aba = 'resumo' | 'jogos' | 'classificacao' | 'plantel';
	let aba = $state<Aba>('resumo');
	let vistaJogos = $state<'lista' | 'calendario'>('lista');
	/** '' = todas. Só a lista de jogos permite todas; a classificação não. */
	let provaJogos = $state('');
	let tabelaEscolhida = $state('');

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

	/** Uma opção por tabela em que a equipa aparece. Sem "todas": séries diferentes não se
	 *  enfrentam, por isso uma tabela única não teria significado. */
	const tabelas = $derived(
		data.provas.flatMap((p) =>
			p.dados.classificacao
				.filter((g) => g.linhas.some((l) => l.equipa === data.equipa))
				.map((g, i) => {
					const prova = p.dados.competicao;
					// a série tanto vem no nome da competição (`- SERIE C`) como no grupo (`SERIE A`)
					const serie = prova.serie
						? `Série ${prova.serie}`
						: g.nome?.replace(/^S[EÉ]RIE\s+/i, 'Série ');
					return {
						chave: `${p.id}:${g.nome ?? i}`,
						rotulo: `${prova.grupo_nome ?? prova.nome}${serie ? ` · ${serie}` : ''}`,
						grupoId: prova.grupo_id ?? String(prova.id),
						linhas: g.linhas
					};
				})
		)
	);
	$effect(() => {
		if (tabelas.length && !tabelas.some((t) => t.chave === tabelaEscolhida))
			tabelaEscolhida = tabelas[0].chave;
	});
	const tabela = $derived(tabelas.find((t) => t.chave === tabelaEscolhida) ?? tabelas[0]);

	/** Provas para o filtro da lista de jogos — esse sim tem "todas". */
	const provas = $derived(
		data.provas.map((p) => ({
			id: String(p.id),
			rotulo: `${p.dados.competicao.grupo_nome ?? p.dados.competicao.nome}${p.dados.competicao.serie ? ` · Série ${p.dados.competicao.serie}` : ''}`,
			ids: new Set(p.dados.jogos.map((j) => j.id))
		}))
	);
	const filtrar = (lista: Jogo[]) => {
		if (!provaJogos) return lista;
		const p = provas.find((x) => x.id === provaJogos);
		return p ? lista.filter((j) => p.ids.has(j.id)) : lista;
	};
	const proximosFiltrados = $derived(filtrar(proximos));
	const anterioresFiltrados = $derived(filtrar(anteriores));

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
					a.amarelos = (a.amarelos ?? 0) + (j.amarelos ?? 0);
					a.azuis = (a.azuis ?? 0) + (j.azuis ?? 0);
					a.vermelhos = (a.vermelhos ?? 0) + (j.vermelhos ?? 0);
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
		<!-- sem filtro: o calendário mostra o mês da equipa inteiro, de todas as provas -->
		<CalendarioMes {jogos} equipa={data.equipa} emblemas={data.emblemas} />
	{:else}
		{#if provas.length > 1}
			<select bind:value={provaJogos} aria-label="Competição">
				<option value="">Todas as competições</option>
				{#each provas as p (p.id)}<option value={p.id}>{p.rotulo}</option>{/each}
			</select>
		{/if}
		{#if proximosFiltrados.length}
			<p class="rotulo">Por disputar</p>
			{#each proximosFiltrados as j (j.id ?? `${j.casa}${j.fora}`)}
				<LinhaJogo jogo={paraAgenda(j)} emblemas={data.emblemas} seguida={destaque} comData />
			{/each}
		{/if}
		{#if anterioresFiltrados.length}
			<p class="rotulo">Resultados</p>
			{#each anterioresFiltrados as j (j.id ?? `${j.casa}${j.fora}`)}
				<LinhaJogo jogo={paraAgenda(j)} emblemas={data.emblemas} seguida={destaque} comData />
			{/each}
		{/if}
		{#if proximosFiltrados.length + anterioresFiltrados.length === 0}
			<p class="vazio">Sem jogos nesta competição.</p>
		{/if}
	{/if}
{:else if aba === 'classificacao'}
	{#if tabelas.length === 0}
		<p class="vazio">Esta equipa não tem classificação publicada.</p>
	{:else}
		<!-- sem "todas as competições", de propósito: séries diferentes não se enfrentam e
		     uma tabela fundida compararia adversários disjuntos -->
		{#if tabelas.length > 1}
			<select bind:value={tabelaEscolhida} aria-label="Competição">
				{#each tabelas as t (t.chave)}<option value={t.chave}>{t.rotulo}</option>{/each}
			</select>
		{:else}
			<p class="rotulo">{tabelas[0].rotulo}</p>
		{/if}

		<table>
			<thead>
				<tr>
					<th class="p">#</th><th class="eq">Equipa</th>
					<th><abbr title="Jogos">J</abbr></th>
					<th><abbr title="Diferença de golos">DG</abbr></th>
					<th class="ptst">P</th>
				</tr>
			</thead>
			<tbody>
				{#each tabela.linhas as l (l.equipa)}
					<tr class:minha={l.equipa === data.equipa}>
						<td class="p">{l.posicao}</td>
						<th class="eq">
							<a href={caminhoEquipa(l.equipa, data.categoria)}>
								<Emblema equipa={l.equipa} src={data.emblemas[l.equipa]} tamanho={18} />{l.equipa}
							</a>
						</th>
						<td>{l.jogos}</td>
						<td class:pos={l.diferenca > 0} class:neg={l.diferenca < 0}>
							{l.diferenca > 0 ? '+' : ''}{l.diferenca}
						</td>
						<td class="ptst">{l.pontos}</td>
					</tr>
				{/each}
			</tbody>
		</table>
		<a class="verProva" href={`/competicoes/${tabela.grupoId}`}>Ver a competição ›</a>
	{/if}
{:else}
	{#if plantel.length === 0}
		<p class="vazio">Ainda não há fichas de jogo publicadas para esta equipa.</p>
	{:else}
		<!-- tabela com cabeçalho: antes eram colunas sem nome e desalinhadas, porque
		     cada célula só aparecia quando o valor não era zero -->
		<div class="rolo">
			<table class="plantel">
				<thead>
					<tr>
						<th class="nome" scope="col">Jogador</th>
						<th scope="col"><abbr title="Jogos">J</abbr></th>
						<th scope="col"><abbr title="Golos">G</abbr></th>
						<th scope="col"><abbr title="Assistências">A</abbr></th>
						<th scope="col"><abbr title="Defesas">D</abbr></th>
						<th scope="col"><span class="cartao am" aria-hidden="true"></span><span class="sr">Cartões amarelos</span></th>
						<th scope="col"><span class="cartao az" aria-hidden="true"></span><span class="sr">Cartões azuis</span></th>
						<th scope="col"><span class="cartao vm" aria-hidden="true"></span><span class="sr">Cartões vermelhos</span></th>
					</tr>
				</thead>
				<tbody>
					{#each plantel as j (j.nome)}
						<tr>
							<th class="nome" scope="row">{j.nome}</th>
							<td>{j.jogos}</td>
							<td class:marcou={j.golos > 0}>{j.golos || '–'}</td>
							<td>{j.assistencias || '–'}</td>
							<td>{j.defesas || '–'}</td>
							<td>{j.amarelos || '–'}</td>
							<td>{j.azuis || '–'}</td>
							<td>{j.vermelhos || '–'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<p class="nota">Somado entre as provas do escalão, a partir das fichas de jogo publicadas.</p>
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

	select { width: 100%; padding: 0.5rem 0.6rem; margin-bottom: 0.7rem; font-size: 0.8rem;
		border-radius: 8px; border: 1px solid var(--borda);
		background: var(--cartao); color: inherit; }

	table { width: 100%; border-collapse: collapse; font-size: 0.76rem;
		font-variant-numeric: tabular-nums; }
	table th, table td { padding: 0.4rem 0.25rem; text-align: right; }
	thead th { font-size: 0.64rem; color: var(--suave); font-weight: 600;
		border-bottom: 1px solid var(--borda); }
	.p { width: 1.4rem; text-align: center; color: var(--suave); }
	.eq { text-align: left; width: 100%; font-weight: 400; }
	.eq a { display: flex; align-items: center; gap: 0.35rem; text-decoration: none; }
	.ptst { font-weight: 700; }
	tbody tr + tr th, tbody tr + tr td { border-top: 1px solid var(--borda); }
	tbody tr.minha { background: var(--acento-fraco); }
	tbody tr.minha .eq { font-weight: 600; }
	.pos { color: var(--acento); }
	.neg { color: var(--suave); }
	.verProva { display: inline-block; margin-top: 0.7rem; font-size: 0.74rem;
		color: var(--acento); text-decoration: none; }

	.rolo { overflow-x: auto; -webkit-overflow-scrolling: touch; }
	.plantel { width: 100%; border-collapse: collapse; font-size: 0.76rem;
		font-variant-numeric: tabular-nums; }
	.plantel th, .plantel td { padding: 0.4rem 0.25rem; text-align: right; white-space: nowrap; }
	.plantel thead th { font-size: 0.64rem; color: var(--suave); font-weight: 600;
		border-bottom: 1px solid var(--borda); }
	.plantel .nome { text-align: left; width: 100%; font-weight: 400; font-size: 0.8rem;
		position: sticky; left: 0; background: var(--fundo); }
	.plantel tbody tr + tr th, .plantel tbody tr + tr td { border-top: 1px solid var(--borda); }
	.plantel td { color: var(--suave); }
	.plantel .marcou { color: var(--acento); font-weight: 700; }
	abbr { text-decoration: none; }
	/* os cartões identificam-se pela cor, como na fonte; o nome vai no cabeçalho para
	   quem usa leitor de ecrã */
	.cartao { display: inline-block; width: 8px; height: 11px; border-radius: 2px;
		vertical-align: -1px; }
	.cartao.am { background: #e6b800; }
	.cartao.az { background: #2f6fd0; }
	.cartao.vm { background: #c0392b; }
	.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
	.nota { color: var(--suave); font-size: 0.68rem; margin-top: 0.6rem; }
	.vazio { color: var(--suave); font-size: 0.82rem; }
</style>
