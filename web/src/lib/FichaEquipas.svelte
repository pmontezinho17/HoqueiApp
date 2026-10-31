<script lang="ts">
	import { rolarSoSePreciso } from '$lib/rolar';
	import { nomeProprio } from '$lib/formato';
	import type { EquipaFicha, LinhaJogador } from './tipos';
	let {
		equipas,
		/** Antes do apito as colunas de estatística estão todas a zero e não dizem nada:
		 *  mostrar dez colunas de zeros é pior do que não as mostrar. */
		porComecar = false
	}: { equipas: EquipaFicha[]; porComecar?: boolean } = $props();
	const jogadores = (e: EquipaFicha) => e.jogadores.filter((j) => !j.papel);
	const tecnicos = (e: EquipaFicha) => e.jogadores.filter((j) => j.papel);
	// "0/0" é o caso esmagador; só vale a pena destacar quem realmente rematou
	const usou = (v: string | null) => !!v && v !== '0/0';

	/**
	 * Os cartões de quem está no banco, para a linha da equipa técnica.
	 *
	 * **Pedido por um colega do dono a 12/10/2026**, que leu o regulamento e notou que a
	 * disciplina dos não atletas também conta. A fonte dava-nos estes números desde sempre —
	 * a tabela dos jogadores já os mostrava — e nós é que desenhámos a linha dos técnicos
	 * como uma lista de nomes e mais nada.
	 *
	 * Só quem levou alguma coisa aparece, e não há colunas fixas como na tabela de cima:
	 * medido nas 317 fichas publicadas a 12/10/2026, são 42 cartões em 1745 linhas de banco,
	 * 2,4%. Três colunas de travessões em todas as fichas para isto era ruído.
	 */
	type Marca = { classe: string; titulo: string; quantos: number };
	const CARTOES: [string, string, string, keyof LinhaJogador][] = [
		['am', 'cartão amarelo', 'cartões amarelos', 'cartoes_amarelos'],
		['az', 'cartão azul', 'cartões azuis', 'cartoes_azuis'],
		['vm', 'cartão vermelho', 'cartões vermelhos', 'cartoes_vermelhos']
	];
	function cartoes(t: LinhaJogador): Marca[] {
		const saida: Marca[] = [];
		for (const [classe, um, muitos, campo] of CARTOES) {
			const quantos = (t[campo] as number) || 0;
			if (quantos > 0)
				saida.push({ classe, titulo: quantos > 1 ? `${quantos} ${muitos}` : um, quantos });
		}
		return saida;
	}
</script>

{#each equipas as equipa (equipa.nome)}
	<section>
		<h3>{equipa.nome}</h3>
		<div class="rolo" use:rolarSoSePreciso>
			<table>
				<thead>
					<tr>
						<th class="n" scope="col">#</th>
						<th class="nome" scope="col">Jogador</th>
						{#if !porComecar}
						<th scope="col"><abbr title="Golos">G</abbr></th>
						<th scope="col"><abbr title="Assistências">A</abbr></th>
						<th scope="col"><abbr title="Defesas">D</abbr></th>
						<th scope="col"><abbr title="Penalidades: convertidas/tentadas">Pe</abbr></th>
						<th scope="col"><abbr title="Livres diretos: convertidos/tentados">LD</abbr></th>
						<th scope="col"><span class="cartao am" aria-hidden="true"></span><span class="sr">Cartões amarelos</span></th>
						<th scope="col"><span class="cartao az" aria-hidden="true"></span><span class="sr">Cartões azuis</span></th>
						<th scope="col"><span class="cartao vm" aria-hidden="true"></span><span class="sr">Cartões vermelhos</span></th>
					{/if}
					</tr>
				</thead>
				<tbody>
					{#each jogadores(equipa) as j (j.nome)}
						<tr>
							<td class="n">{j.numero ?? ''}{#if j.titular}<span class="tit" title="Cinco inicial">•</span>{/if}</td>
							<th class="nome" scope="row">{nomeProprio(j.nome)}</th>
							{#if !porComecar}
							<td class:marcou={(j.golos ?? 0) > 0}>{j.golos ?? '–'}</td>
							<td>{j.assistencias ?? '–'}</td>
							<td>{j.defesas ?? '–'}</td>
							<td class="lance" class:usou={usou(j.penalidades)}>{j.penalidades ?? '–'}</td>
							<td class="lance" class:usou={usou(j.livres_diretos)}>{j.livres_diretos ?? '–'}</td>
							<td class:levou={j.cartoes_amarelos > 0}>{j.cartoes_amarelos || '–'}</td>
							<td class:levou={j.cartoes_azuis > 0}>{j.cartoes_azuis || '–'}</td>
							<td class:levou={j.cartoes_vermelhos > 0}>{j.cartoes_vermelhos || '–'}</td>
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		{#if tecnicos(equipa).length}
			<p class="tecnicos">
				{#each tecnicos(equipa) as t, i (t.nome)}{i ? ' · ' : ''}<span class="tecnico"><span class="papel">{t.papel}</span> {t.nome}{#if !porComecar}{#each cartoes(t) as c (c.classe)}<span class="cartao {c.classe}" aria-hidden="true"></span><span class="quantos">{c.quantos}</span><span class="sr">{c.titulo}</span>{/each}{/if}</span>{/each}
			</p>
		{/if}
	</section>
{/each}

<style>
	section { margin-bottom: 1.4rem; }
	h3 { font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.06em;
		color: var(--suave); margin: 0 0 0.5rem; }
	.rolo { --coluna-n: 2.4rem; overflow-x: auto; background: var(--cartao); border: 1px solid var(--borda);
		border-radius: 10px; }
	/* `separate` e não `collapse`: no Safari, uma célula `position: sticky` dentro de uma
	   tabela com `border-collapse: collapse` perde as bordas ao rolar — o fundo acompanha a
	   célula fixa mas as bordas colapsadas ficam com o conteúdo. As nossas bordas já estão
	   nas células (`border-top`), por isso o resultado desenhado é o mesmo.
	   https://bugs.webkit.org/show_bug.cgi?id=128486 */
	table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 0.82rem;
		font-variant-numeric: tabular-nums; }
	th, td { padding: 0.45rem 0.4rem; text-align: right; white-space: nowrap; }
	thead th { font-size: 0.7rem; color: var(--suave); border-bottom: 1px solid var(--borda); }
	abbr { text-decoration: none; }
	/* A largura da coluna e o encosto do nome saem da mesma variável, e a largura é
	   **imposta** com min/max.
	   Numa tabela, `width` é uma sugestão: com números de um só dígito esta célula
	   renderizava 29px em vez dos 38 pedidos, enquanto o nome continuava pregado a
	   2,4rem — e tapava 9px da coluna dos golos. Via-se na ficha de qualquer jogo em que
	   uma equipa tivesse camisolas de um dígito e a outra de dois. */
	.n { text-align: left; color: var(--suave);
		box-sizing: border-box;
		width: var(--coluna-n); min-width: var(--coluna-n); max-width: var(--coluna-n);
		position: sticky; left: 0; background: var(--cartao); }
	.tit { color: var(--acento); margin-left: 0.15rem; }
	/* com dez colunas a tabela rola; sem isto perdia-se de vista de quem é a linha.
	   O nome encosta a seguir ao número, não por cima dele. */
	.nome { text-align: left; width: 100%; font-weight: 500;
		position: sticky; left: var(--coluna-n); background: var(--cartao); }
	.marcou { font-weight: 700; color: var(--acento); }
	.lance { color: var(--suave); font-size: 0.76rem; }
	.lance.usou { color: var(--texto); font-weight: 600; }
	/* mesma linguagem do plantel: cor no cabeçalho, nome só para leitor de ecrã */
	.cartao { display: inline-block; width: 8px; height: 11px; border-radius: 2px;
		vertical-align: -1px; }
	.cartao.am { background: #e6b800; }
	.cartao.az { background: #2f6fd0; }
	.cartao.vm { background: #c0392b; }
	.levou { color: var(--texto); font-weight: 700; }
	.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
	tbody tr + tr th, tbody tr + tr td { border-top: 1px solid var(--borda); }
	.tecnicos { font-size: 0.72rem; color: var(--suave); margin: 0.4rem 0 0;
		line-height: 1.8; }
	/* só o papel vai a negrito. Era `.tecnicos span` e engordava as chapas dos cartões
	   também — e uma chapa a negrito não é uma chapa mais forte, é só mais larga. */
	.tecnicos .papel { font-weight: 600; }
	/* **Cada técnico é indivisível.** Sem isto a linha partia entre o nome e a chapa do
	   cartão, e a 375px vi a chapa amarela do PEDRO GONCALVES cair sozinha para a linha
	   de baixo, encostada ao `·` do técnico seguinte — a ler como se fosse dele. Os `·`
	   ficam de fora do `nowrap` e são eles que dão as oportunidades de quebra. */
	.tecnicos .tecnico { white-space: nowrap; }
	.tecnicos .cartao { margin-left: 0.3rem; }
	/* o número vai sempre, mesmo quando é 1: é a mesma linguagem da tabela de cima, onde
	   a célula diz `1` e não uma chapa sozinha */
	.tecnicos .quantos { margin-left: 0.12rem; font-weight: 700; color: var(--texto); }
</style>
