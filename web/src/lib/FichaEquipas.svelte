<script lang="ts">
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
					</tr>
				</thead>
				<tbody>
					{#each jogadores(equipa) as j (j.nome)}
						<tr>
							<td class="n">{j.numero ?? ''}{#if j.titular}<span class="tit" title="Cinco inicial">•</span>{/if}</td>
							<th class="nome" scope="row">{j.nome}</th>
							<td class:marcou={(j.golos ?? 0) > 0}>{j.golos ?? '–'}</td>
							<td>{j.assistencias ?? '–'}</td>
							<td>{j.defesas ?? '–'}</td>
							<td class="lance" class:usou={usou(j.penalidades)}>{j.penalidades ?? '–'}</td>
							<td class="lance" class:usou={usou(j.livres_diretos)}>{j.livres_diretos ?? '–'}</td>
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
	table { width: 100%; border-collapse: collapse; font-size: 0.82rem;
		font-variant-numeric: tabular-nums; }
	th, td { padding: 0.45rem 0.4rem; text-align: right; white-space: nowrap; }
	thead th { font-size: 0.7rem; color: var(--suave); border-bottom: 1px solid var(--borda); }
	abbr { text-decoration: none; }
	.n { width: 2.4rem; text-align: left; color: var(--suave); }
	.tit { color: var(--acento); margin-left: 0.15rem; }
	.nome { text-align: left; width: 100%; font-weight: 500; }
	.marcou { font-weight: 700; color: var(--acento); }
	.lance { color: var(--suave); font-size: 0.76rem; }
	.lance.usou { color: var(--texto); font-weight: 600; }
	tbody tr + tr th, tbody tr + tr td { border-top: 1px solid var(--borda); }
	.tecnicos { font-size: 0.72rem; color: var(--suave); margin: 0.4rem 0 0; }
	.tecnicos span { font-weight: 600; }
</style>
