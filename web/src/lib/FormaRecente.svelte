<script lang="ts">
	import Emblema from './Emblema.svelte';
	import { disputado, type Jogo } from './tipos';

	let {
		jogos, equipa, emblemas
	}: { jogos: Jogo[]; equipa: string; emblemas: Record<string, string> } = $props();

	const DIA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

	/** Os 5 últimos disputados, do mais antigo para o mais recente — lê-se da esquerda. */
	const recentes = $derived(
		jogos
			.filter(disputado)
			.sort((a, b) => (a.data ?? '').localeCompare(b.data ?? ''))
			.slice(-5)
			.map((j) => {
				const emCasa = j.casa === equipa;
				const nossos = emCasa ? j.golos_casa! : j.golos_fora!;
				const deles = emCasa ? j.golos_fora! : j.golos_casa!;
				return {
					jogo: j,
					adversario: emCasa ? j.fora : j.casa,
					resultado: `${nossos}-${deles}`,
					desfecho: nossos > deles ? 'v' : nossos < deles ? 'd' : 'e',
					data: j.data
				};
			})
	);

	const curta = (iso: string | null) => {
		if (!iso) return '';
		const d = new Date(`${iso}T00:00:00`);
		return `${DIA[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
	};
</script>

{#if recentes.length}
	<div class="forma">
		{#each recentes as r (r.jogo.id ?? r.adversario)}
			<svelte:element
				this={r.jogo.id ? 'a' : 'div'} href={r.jogo.id ? `/jogo/${r.jogo.id}` : null}
				class="item"
				aria-label={`${curta(r.data)}: ${r.resultado} contra ${r.adversario}`}
			>
				<span class="data">{curta(r.data)}</span>
				<Emblema equipa={r.adversario} src={emblemas[r.adversario]} tamanho={24} />
				<span class="res {r.desfecho}">{r.resultado}</span>
			</svelte:element>
		{/each}
	</div>
{/if}

<style>
	.forma { display: flex; gap: 0.3rem; overflow-x: auto; scrollbar-width: none;
		margin: 0 -0.9rem; padding: 0 0.9rem 0.2rem; }
	.forma::-webkit-scrollbar { display: none; }
	.item { flex: 1 0 3.6rem; display: flex; flex-direction: column; align-items: center;
		gap: 0.2rem; text-decoration: none; color: inherit; }
	.data { font-size: 0.6rem; color: var(--suave); white-space: nowrap; }
	/* o resultado é a pastilha colorida: lê-se a forma da equipa de relance */
	.res { width: 100%; text-align: center; padding: 0.15rem 0.1rem; border-radius: 5px;
		font-size: 0.7rem; font-weight: 600; font-variant-numeric: tabular-nums; color: #fff; }
	.res.v { background: #16865c; }
	.res.d { background: #b4454a; }
	.res.e { background: var(--suave); }
</style>
