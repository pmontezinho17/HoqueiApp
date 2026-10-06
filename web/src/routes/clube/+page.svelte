<script lang="ts">
	import Emblema from '$lib/Emblema.svelte';
	import Folha from '$lib/Folha.svelte';
	import { carregarCompeticao } from '$lib/dados';
	import { favoritos } from '$lib/favoritos.svelte';
	import EscolherClubes from '$lib/EscolherClubes.svelte';
	import { competicoesVivas } from '$lib/clubes';
	import { guia } from '$lib/guia.svelte';
	import { porQuando } from '$lib/formato';
	import { caminhoEquipa } from '$lib/slug';
	import { disputado, type FicheiroCompeticao, type Jogo } from '$lib/tipos';

	let { data } = $props();

	let aberta = $state(false);
	/**
	 * A grelha de clubes está aberta.
	 *
	 * Abre-se sozinha a quem não segue ninguém, e **fica aberta** até a pessoa confirmar:
	 * a condição anterior era "não tem favoritos", e essa deixa de ser verdade no primeiro
	 * toque — a grelha fechava-se com uma equipa escolhida e ninguém chegava à segunda.
	 *
	 * Decide-se uma vez, quando o armazenamento já foi lido.
	 */
	let escolhendo = $state(false);
	let decidido = false;
	$effect(() => {
		if (decidido || !favoritos.carregado) return;
		decidido = true;
		escolhendo = favoritos.lista.length === 0;
	});

	/**
	 * Jogos por nome de equipa — serve para o nome do clube na grelha.
	 *
	 * Dois nomes com o mesmo comprimento desempatam pelo mais usado, e é isso que separa a
	 * grafia certa da gralha: `AD OEIRAS` aparece em 16 jogos e `AD OERIAS` em 1.
	 */
	/** id da competição → nome da prova, para o painel dizer em que prova cada equipa anda */
	const nomesDeProva = $derived.by(() => {
		const n: Record<number, string> = {};
		for (const j of data.agenda as { comp: number; prova: string }[]) n[j.comp] = j.prova;
		return n;
	});

	/** competições que ainda têm jogos por jogar: marca as provas acabadas, não as esconde */
	const vivas = $derived(
		competicoesVivas(data.agenda as { comp: number; gc: number | null }[])
	);

	const jogosPorEquipa = $derived.by(() => {
		const n: Record<string, number> = {};
		for (const j of data.agenda as { casa: string; fora: string }[]) {
			n[j.casa] = (n[j.casa] ?? 0) + 1;
			n[j.fora] = (n[j.fora] ?? 0) + 1;
		}
		return n;
	});
	let procura = $state('');
	let campo = $state<HTMLInputElement | null>(null);

	$effect(() => { if (aberta) campo?.focus(); });

	const normal = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
	const encontradas = $derived.by(() => {
		const q = normal(procura.trim());
		if (q.length < 2) return [];
		return data.equipas.filter((e) => normal(`${e.equipa} ${e.categoria}`).includes(q)).slice(0, 40);
	});

	const hoje = new Date().toISOString().slice(0, 10);

	/** Só o essencial por equipa: o detalhe vive na página de cada uma. */
	async function resumir() {
		const ids = [...new Set(favoritos.lista.flatMap((f) => f.competicoes))];
		const provas = new Map<number, FicheiroCompeticao>();
		await Promise.all(ids.map(async (id) => {
			try { provas.set(id, await carregarCompeticao(id, fetch)); } catch { /* ignora */ }
		}));
		return favoritos.lista.map((f) => {
			const seus = porQuando(
				f.competicoes.flatMap((id) => provas.get(id)?.jogos ?? [])
					.filter((j) => j.casa === f.equipa || j.fora === f.equipa)
			);
			return {
				fav: f,
				jogos: seus,
				proximo: seus.find((j) => !disputado(j) && (j.data ?? '') >= hoje),
				ultimo: [...seus].reverse().find(disputado)
			};
		});
	}

	const quando = (j: Jogo | undefined) => {
		if (!j?.data) return '';
		const d = new Date(`${j.data}T00:00:00`);
		return `${d.getDate()}/${d.getMonth() + 1}${j.hora ? `, ${j.hora.slice(0, 5)}` : ''}`;
	};
	const adversario = (j: Jogo, equipa: string) => (j.casa === equipa ? j.fora : j.casa);
</script>

<svelte:head><title>O Meu Clube — Hóquei em Patins</title></svelte:head>

{#if escolhendo}
	<!--
	  O primeiro ecrã de quem abre a app: escolher equipas antes de qualquer explicação.
	  Também se chega aqui pelo "Escolher equipas" quando já se segue alguma.
	-->
	<EscolherClubes
		equipas={data.equipas}
		emblemas={data.emblemas}
		usos={jogosPorEquipa}
		vivas={vivas}
		provas={nomesDeProva}
		concluir={() => {
			escolhendo = false;
			// o guia começa aqui, depois de haver equipas para ele falar sobre
			guia.comecar();
		}}
	/>
{:else}
	{#await resumir()}
		<p class="vazio">A reunir os jogos…</p>
	{:then resumos}
			<!--
			  Lançador, não painel: cada equipa leva à sua página, onde estão jogos,
			  classificação e plantel. Empilhar tudo aqui não escala com várias equipas
			  e dava um resumo fino em vez de uma página a sério.
			-->
			{#each resumos as r, i (r.fav.equipa + r.fav.categoria)}
				<!-- `data-guia` só no primeiro: o tour ilumina um elemento, não uma lista -->
				<a class="cartao" data-guia={i === 0 ? 'clube-cartoes' : undefined}
					href={caminhoEquipa(r.fav.equipa, r.fav.categoria)}>
					<Emblema equipa={r.fav.equipa} src={data.emblemas[r.fav.equipa]} tamanho={32} />
					<span class="quem">
						<span class="nome">{r.fav.equipa}</span>
						<span class="escalao">{r.fav.categoria}</span>
					</span>
					<span class="jogo">
						{#if r.proximo}
							<span class="rot">próximo</span>
							<span class="adv">{adversario(r.proximo, r.fav.equipa)}</span>
							<span class="qd">{quando(r.proximo)}</span>
						{:else if r.ultimo}
							<span class="rot">último</span>
							<span class="adv">{adversario(r.ultimo, r.fav.equipa)}</span>
							<span class="qd">{r.ultimo.golos_casa}–{r.ultimo.golos_fora}</span>
						{/if}
					</span>
					<span class="seta" aria-hidden="true">›</span>
				</a>
			{/each}
		<button class="secundaria" data-guia="clube-seguir" onclick={() => (escolhendo = true)}>Escolher equipas</button>
	{/await}
{/if}

<Folha bind:aberta titulo="Seguir uma equipa">
	<input bind:this={campo} type="search" bind:value={procura} placeholder="Nome do clube"
		aria-label="Procurar clube" />
	{#each encontradas as e (e.equipa + e.categoria)}
		<button class="opcao" class:activa={favoritos.segue(e.equipa, e.categoria)}
			onclick={() => favoritos.alternar(e.equipa, e.categoria, e.competicoes)}>
			<span>{e.equipa}<span class="cat">{e.categoria}</span></span>
			<span class="marca">{favoritos.segue(e.equipa, e.categoria) ? '✓' : '+'}</span>
		</button>
	{/each}
	{#if procura.trim().length >= 2 && encontradas.length === 0}
		<p class="vazio">Nenhum clube encontrado.</p>
	{:else if procura.trim().length < 2}
		<p class="vazio">Escreve o nome do clube — por exemplo “Parede” ou “Benfica”.</p>
	{/if}
</Folha>

<style>
	/* o convite de boas-vindas deu lugar à grelha de clubes, em `EscolherClubes.svelte` */
	.secundaria { min-height: 44px; padding: 0.7rem 1.4rem; font-size: 0.88rem;
		cursor: pointer; border-radius: 8px; border: 1px solid var(--acento);
		width: 100%; background: none; color: var(--acento); margin-top: 0.6rem; }

	.cartao { display: grid; grid-template-columns: auto 1fr auto auto; align-items: center;
		gap: 0.6rem; padding: 0.6rem 0.5rem; text-decoration: none;
		border-bottom: 1px solid var(--borda); }
	.cartao:hover, .cartao:focus-visible { background: var(--acento-fraco); outline: none; }
	.quem { min-width: 0; }
	.nome { display: block; font-size: 0.86rem; overflow: hidden; text-overflow: ellipsis;
		white-space: nowrap; }
	.escalao { display: block; font-size: 0.64rem; color: var(--acento); letter-spacing: 0.04em; }
	.jogo { text-align: right; min-width: 0; }
	.rot { display: block; font-size: 0.58rem; color: var(--suave); text-transform: uppercase;
		letter-spacing: 0.05em; }
	.adv { display: block; font-size: 0.7rem; overflow: hidden; text-overflow: ellipsis;
		white-space: nowrap; max-width: 8rem; }
	.qd { display: block; font-size: 0.66rem; color: var(--suave);
		font-variant-numeric: tabular-nums; }
	.seta { color: var(--suave); }

	input { width: 100%; padding: 0.6rem 0.7rem; margin: 0.2rem 0 0.8rem; font-size: 1rem;
		border-radius: 8px; border: 1px solid var(--borda); background: var(--cartao); color: inherit; }
	.opcao { display: flex; justify-content: space-between; align-items: center; gap: 0.6rem;
		width: 100%; min-height: 44px; padding: 0.55rem 0.7rem; margin-bottom: 0.3rem;
		font-size: 0.85rem; text-align: left; cursor: pointer; border-radius: 8px;
		border: 1px solid var(--borda); background: var(--cartao); color: inherit; }
	.opcao.activa { border-color: var(--acento); }
	.cat { display: block; font-size: 0.68rem; color: var(--suave); }
	.marca { color: var(--acento); font-weight: 700; }
	.vazio { color: var(--suave); font-size: 0.82rem; }
</style>
