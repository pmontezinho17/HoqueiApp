<script lang="ts">
	import { nomeProprio } from '$lib/formato';
	import type { EquipaFicha } from './tipos';
	let { equipas }: { equipas: EquipaFicha[] } = $props();
	const jogadores = (e: EquipaFicha) => e.jogadores.filter((j) => !j.papel);
	const tecnicos = (e: EquipaFicha) => e.jogadores.filter((j) => j.papel);
	// "0/0" é o caso esmagador; só vale a pena destacar quem realmente rematou
	const usou = (v: string | null) => !!v && v !== '0/0';
</script>

{#each equipas as equipa (equipa.nome)}
	<section>
		<h3>{equipa.nome}</h3>
		<div class="rolo">
			<table>
				<thead>
					<tr>
						<th class="n" scope="col">#</th>
						<th class="nome" scope="col">Jogador</th>
						<th scope="col"><abbr title="Golos">G</abbr></th>
						<th scope="col"><abbr title="Assistências">A</abbr></th>
						<th scope="col"><abbr title="Defesas">D</abbr></th>
						<th scope="col"><abbr title="Penalidades: convertidas/tentadas">Pe</abbr></th>
						<th scope="col"><abbr title="Livres diretos: convertidos/tentados">LD</abbr></th>
						<th scope="col"><span class="cartao am" aria-hidden="true"></span><span class="sr">Cartões amarelos</span></th>
						<th scope="col"><span class="cartao az" aria-hidden="true"></span><span class="sr">Cartões azuis</span></th>
						<th scope="col"><span class="cartao vm" aria-hidden="true"></span><span class="sr">Cartões vermelhos</span></th>
					</tr>
				</thead>
				<tbody>
					{#each jogadores(equipa) as j (j.nome)}
						<tr>
							<td class="n">{j.numero ?? ''}{#if j.titular}<span class="tit" title="Cinco inicial">•</span>{/if}</td>
							<th class="nome" scope="row">{nomeProprio(j.nome)}</th>
							<td class:marcou={(j.golos ?? 0) > 0}>{j.golos ?? '–'}</td>
							<td>{j.assistencias ?? '–'}</td>
							<td>{j.defesas ?? '–'}</td>
							<td class="lance" class:usou={usou(j.penalidades)}>{j.penalidades ?? '–'}</td>
							<td class="lance" class:usou={usou(j.livres_diretos)}>{j.livres_diretos ?? '–'}</td>
							<td class:levou={j.cartoes_amarelos > 0}>{j.cartoes_amarelos || '–'}</td>
							<td class:levou={j.cartoes_azuis > 0}>{j.cartoes_azuis || '–'}</td>
							<td class:levou={j.cartoes_vermelhos > 0}>{j.cartoes_vermelhos || '–'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		{#if tecnicos(equipa).length}
			<p class="tecnicos">
				{#each tecnicos(equipa) as t, i (t.nome)}{i ? ' · ' : ''}<span>{t.papel}</span> {t.nome}{/each}
			</p>
		{/if}
	</section>
{/each}

<style>
	section { margin-bottom: 1.4rem; }
	h3 { font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.06em;
		color: var(--suave); margin: 0 0 0.5rem; }
	.rolo { overflow-x: auto; background: var(--cartao); border: 1px solid var(--borda);
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
	.n { width: 2.4rem; text-align: left; color: var(--suave);
		position: sticky; left: 0; background: var(--cartao); }
	.tit { color: var(--acento); margin-left: 0.15rem; }
	/* com dez colunas a tabela rola; sem isto perdia-se de vista de quem é a linha.
	   O nome encosta a seguir ao número, não por cima dele. */
	.nome { text-align: left; width: 100%; font-weight: 500;
		position: sticky; left: 2.4rem; background: var(--cartao); }
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
	.tecnicos { font-size: 0.72rem; color: var(--suave); margin: 0.4rem 0 0; }
	.tecnicos span { font-weight: 600; }
</style>
