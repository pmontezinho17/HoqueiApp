<script lang="ts">
	import Emblema from './Emblema.svelte';
	import { disputado, type Jogo } from './tipos';

	let {
		jogos, equipas, emblemas
	}: { jogos: Jogo[]; equipas: Set<string>; emblemas: Record<string, string> } = $props();

	const hoje = new Date().toISOString().slice(0, 10);
	const MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
		'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
	const CABECA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

	let mes = $state(new Date().getMonth());
	let ano = $state(new Date().getFullYear());

	const porDia = $derived.by(() => {
		const m = new Map<string, Jogo[]>();
		for (const j of jogos) if (j.data) (m.get(j.data) ?? m.set(j.data, []).get(j.data)!).push(j);
		return m;
	});

	/** Semanas do mês, começando ao domingo. Dias vazios ficam a null. */
	const semanas = $derived.by(() => {
		const primeiro = new Date(ano, mes, 1);
		const dias: (string | null)[] = Array(primeiro.getDay()).fill(null);
		const ultimo = new Date(ano, mes + 1, 0).getDate();
		for (let d = 1; d <= ultimo; d++)
			dias.push(`${ano}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
		while (dias.length % 7) dias.push(null);
		return Array.from({ length: dias.length / 7 }, (_, i) => dias.slice(i * 7, i * 7 + 7));
	});

	function andar(passo: number) {
		const d = new Date(ano, mes + passo, 1);
		mes = d.getMonth();
		ano = d.getFullYear();
	}

	// casa/fora pela cor da célula: para quem tem de conduzir, é *a* informação
	const emCasa = (j: Jogo) => equipas.has(j.casa);
	const adversario = (j: Jogo) => (equipas.has(j.casa) ? j.fora : j.casa);
</script>

<div class="topo">
	<button onclick={() => andar(-1)} aria-label="Mês anterior">‹</button>
	<span>{MES[mes]} de {ano}</span>
	<button onclick={() => andar(1)} aria-label="Mês seguinte">›</button>
</div>

<table class="mes">
	<thead>
		<tr>{#each CABECA as c, i (i)}<th scope="col">{c}</th>{/each}</tr>
	</thead>
	<tbody>
		{#each semanas as semana, i (i)}
			<tr>
				{#each semana as dia, j (j)}
					<td class:vazio={!dia}>
						{#if dia}
							{@const doDia = porDia.get(dia) ?? []}
							<div class="celula" class:hoje={dia === hoje} class:fora={doDia.length && !emCasa(doDia[0])}
								class:comJogo={doDia.length}>
								<span class="num">
									{Number(dia.slice(-2))}
									{#if doDia.length && !emCasa(doDia[0])}<b class="f" title="Fora">F</b>{/if}
								</span>
								{#each doDia.slice(0, 1) as j (j.id ?? j.casa)}
									<svelte:element this={j.id && disputado(j) ? 'a' : 'div'}
										href={j.id && disputado(j) ? `/jogo/${j.id}` : null} class="jogo">
										<Emblema equipa={adversario(j)} src={emblemas[adversario(j)]} tamanho={18} />
										<span class="hora">
											{disputado(j) ? `${j.golos_casa}-${j.golos_fora}` : (j.hora?.slice(0, 5) ?? '')}
										</span>
									</svelte:element>
								{/each}
								{#if doDia.length > 1}<span class="mais">+{doDia.length - 1}</span>{/if}
							</div>
						{/if}
					</td>
				{/each}
			</tr>
		{/each}
	</tbody>
</table>

<p class="legenda">
	<span class="amostra casa"></span> Em casa
	<span class="amostra fora"></span> Fora <b>F</b>
</p>

<style>
	.topo { display: flex; align-items: center; justify-content: space-between;
		margin-bottom: 0.5rem; font-size: 0.82rem; }
	.topo button { min-width: 40px; min-height: 36px; cursor: pointer; font-size: 1rem;
		border-radius: 8px; border: 1px solid var(--borda);
		background: var(--cartao); color: var(--suave); }

	.mes { width: 100%; border-collapse: collapse; table-layout: fixed; }
	th { font-size: 0.6rem; color: var(--suave); font-weight: 600; padding-bottom: 0.2rem; }
	td { padding: 1px; vertical-align: top; }
	.celula { min-height: 3.1rem; padding: 0.15rem; border-radius: 6px;
		border: 1px solid transparent; display: flex; flex-direction: column;
		align-items: center; gap: 0.1rem; }
	.celula.comJogo { background: var(--cartao); border-color: var(--borda); }
	/* célula escura = jogo fora; é o inverso do fundo claro de quem joga em casa */
	.celula.fora { background: var(--texto); }
	.celula.fora .num, .celula.fora .hora { color: var(--fundo); }
	.celula.hoje { border-color: var(--acento); }
	.num { display: flex; align-items: center; gap: 0.2rem; width: 100%;
		font-size: 0.6rem; color: var(--suave); }
	/* a cor sozinha não chega: inverte-se entre temas e exclui quem não a distingue */
	.f { margin-left: auto; font-size: 0.55rem; font-weight: 700; letter-spacing: 0.02em; }
	.celula.fora .f { color: var(--fundo); }
	.jogo { display: flex; flex-direction: column; align-items: center; gap: 0.05rem;
		text-decoration: none; color: inherit; }
	.hora { font-size: 0.56rem; font-variant-numeric: tabular-nums; }
	.mais { font-size: 0.55rem; color: var(--suave); }

	.legenda { display: flex; align-items: center; gap: 0.35rem; margin-top: 0.6rem;
		font-size: 0.68rem; color: var(--suave); }
	.amostra { display: inline-block; width: 13px; height: 13px; border-radius: 3px;
		border: 1px solid var(--borda); }
	.amostra.casa { background: var(--cartao); }
	.amostra.fora { background: var(--texto); }
	.legenda b { font-size: 0.62rem; }
</style>
