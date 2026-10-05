<script lang="ts">
	/** O separador "Informações": tudo o que não é jogo — onde, quando, quem apitou, e o
	 *  boletim oficial quando a fonte o anexa. */
	import BoletimOficial from '$lib/BoletimOficial.svelte';
	import Icone from '$lib/Icone.svelte';
	import { dataLonga, horaCurta, nomeProprio } from '$lib/formato';
	import type { FichaJogo } from '$lib/tipos';

	let { f, morada, linkMapa }: {
		f: FichaJogo;
		morada: string | null;
		linkMapa: string | null;
	} = $props();
</script>

<ul class="info">
	{#if f.data || f.hora}
		<li>
			<Icone nome="data" />
			<span
				>{f.data ? dataLonga(f.data) : ''}{#if f.data && f.hora}&nbsp;·&nbsp;{/if}{#if f.hora}{horaCurta(
						f.hora
					)}{/if}</span
			>
		</li>
	{/if}
	{#if f.recinto}
		<li><Icone nome="recinto" /><span>{f.recinto}</span></li>
	{/if}
	{#if morada && linkMapa}
		<li>
			<Icone nome="local" />
			<a class="trilho" href={linkMapa} rel="external noopener" target="_blank">
				<span>{morada}</span>
				<span class="seta" aria-hidden="true">›</span>
			</a>
		</li>
	{/if}
	{#if f.arbitros.length}
		<li><Icone nome="arbitro" /><span>{f.arbitros.map(nomeProprio).join(', ')}</span></li>
	{/if}
	{#if f.faltas[0] !== null}
		<li><Icone nome="faltas" /><span>Faltas de equipa: {f.faltas[0]}–{f.faltas[1]}</span></li>
	{/if}
</ul>

{#if f.boletim?.parciais?.length}
	<BoletimOficial boletim={f.boletim} casa={f.casa} fora={f.fora} />
{/if}

<style>
	.info {
		list-style: none;
		margin: 0 0 var(--e-5);
		padding: 0 var(--e-4);
		border: 1px solid var(--borda);
		border-radius: var(--raio-cartao);
		background: var(--cartao);
	}
	.info li {
		display: flex;
		align-items: center;
		gap: var(--e-3);
		min-height: 44px;
		padding: var(--e-3) 0;
		font-size: var(--t-base);
		line-height: 1.4;
	}
	.info li + li { border-top: 1px solid var(--borda-fraca); }
	.info li > span { min-width: 0; }
	.info a.trilho {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--e-2);
		flex: 1;
		min-width: 0;
		text-decoration: none;
		color: inherit;
	}
	.info a.trilho:hover span,
	.info a.trilho:focus-visible span { text-decoration: underline; }
	.seta { color: var(--suave); }
</style>
