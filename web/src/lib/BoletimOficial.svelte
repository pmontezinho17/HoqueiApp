<script lang="ts">
	import { nomeProprio } from '$lib/formato';
	import type { Boletim } from '$lib/tipos';

	let { boletim, casa, fora }: { boletim: Boletim; casa: string; fora: string } = $props();

	const b = $derived(boletim);
	const partes = $derived(b.parciais.filter((p) => p.nome !== 'Resultado final'));
	const final = $derived(b.parciais.find((p) => p.nome === 'Resultado final'));
	/** As faltas só valem a pena se as duas equipas as tiverem — meia tabela não se lê. */
	const temFaltas = $derived(b.faltas_casa.length > 0 && b.faltas_fora.length > 0);
	const oficiais = $derived(Object.entries(b.oficiais));
</script>

{#if partes.length}
	<section>
		<h3>Resultado parte a parte</h3>
		<table>
			<thead>
				<tr>
					<th class="eq" scope="col">Equipa</th>
					{#each partes as p (p.nome)}<th scope="col">{p.nome.replace(' parte', 'ª').replace('ªª', 'ª')}</th>{/each}
					<th class="total" scope="col">Final</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<th class="eq" scope="row">{casa}</th>
					{#each partes as p (p.nome)}<td>{p.casa ?? '–'}</td>{/each}
					<td class="total">{final?.casa ?? '–'}</td>
				</tr>
				<tr>
					<th class="eq" scope="row">{fora}</th>
					{#each partes as p (p.nome)}<td>{p.fora ?? '–'}</td>{/each}
					<td class="total">{final?.fora ?? '–'}</td>
				</tr>
			</tbody>
		</table>
	</section>
{/if}

{#if temFaltas}
	<section>
		<h3>Faltas de equipa, por parte</h3>
		<!-- a ficha só as dá somadas; parte a parte vê-se quando a equipa entrou em bónus -->
		<table>
			<thead>
				<tr>
					<th class="eq" scope="col">Equipa</th>
					{#each b.faltas_casa as _, i}<th scope="col">{i + 1}ª</th>{/each}
					<th class="total" scope="col">Total</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<th class="eq" scope="row">{casa}</th>
					{#each b.faltas_casa as n}<td>{n}</td>{/each}
					<td class="total">{b.faltas_casa.reduce((a, n) => a + n, 0)}</td>
				</tr>
				<tr>
					<th class="eq" scope="row">{fora}</th>
					{#each b.faltas_fora as n}<td>{n}</td>{/each}
					<td class="total">{b.faltas_fora.reduce((a, n) => a + n, 0)}</td>
				</tr>
			</tbody>
		</table>
	</section>
{/if}

{#if b.capitao_casa || b.capitao_fora}
	<section>
		<h3>Capitães</h3>
		<dl>
			{#if b.capitao_casa}<dt>{casa}</dt><dd>{nomeProprio(b.capitao_casa)}</dd>{/if}
			{#if b.capitao_fora}<dt>{fora}</dt><dd>{nomeProprio(b.capitao_fora)}</dd>{/if}
		</dl>
	</section>
{/if}

{#if oficiais.length}
	<section>
		<h3>Equipa de arbitragem e mesa</h3>
		<dl>
			{#each oficiais as [papel, nome] (papel)}
				<dt>{papel}</dt><dd>{nomeProprio(nome)}</dd>
			{/each}
		</dl>
	</section>
{/if}

{#if b.inicio.length || b.termo.length}
	<section>
		<h3>Horas</h3>
		<dl>
			{#each b.inicio as h, i}<dt>Início da {i + 1}ª parte</dt><dd>{h}</dd>{/each}
			{#each b.termo as h, i}<dt>Fim da {i + 1}ª parte</dt><dd>{h}</dd>{/each}
		</dl>
	</section>
{/if}

<p class="nota">Do boletim oficial assinado no fim do jogo.</p>

<style>
	section { margin-bottom: 1.2rem; }
	h3 { font-size: 0.68rem; margin: 0 0 0.4rem; color: var(--suave);
		letter-spacing: 0.04em; text-transform: uppercase; font-weight: 600; }

	table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 0.78rem;
		font-variant-numeric: tabular-nums; }
	th, td { padding: 0.4rem 0.3rem; text-align: right; white-space: nowrap; }
	thead th { font-size: 0.64rem; color: var(--suave); font-weight: 600;
		border-bottom: 1px solid var(--borda); }
	.eq { text-align: left; width: 100%; font-weight: 400;
		overflow: hidden; text-overflow: ellipsis; }
	.total { font-weight: 700; padding-left: 0.6rem; }
	tbody tr + tr th, tbody tr + tr td { border-top: 1px solid var(--borda); }

	dl { display: grid; grid-template-columns: auto 1fr; gap: 0.25rem 0.8rem;
		margin: 0; font-size: 0.78rem; }
	dt { color: var(--suave); font-size: 0.72rem; }
	dd { margin: 0; text-align: right; }

	.nota { margin: 0; font-size: 0.68rem; color: var(--suave); }
</style>
