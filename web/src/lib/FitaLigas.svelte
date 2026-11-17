<script lang="ts">
	/**
	 * Os botões das ligas, por baixo dos dias — pedido do dono a 17/11/2026: *"não era um
	 * drop-down list, era mesmo vários botões pequenos, onde a primeira opção é Todos"*. Cada um
	 * diz quantos jogos tem nesse dia, para se saber o que se esconde antes de tocar.
	 *
	 * Uma fila só que desliza para o lado se não couber: num sábado são cinco botões, e a fila
	 * mede o mesmo com cinco ou com oito.
	 */
	import type { Opcao } from './ligas';

	let { opcoes, valor, escolher, rotulo }: {
		opcoes: Opcao[];
		valor: string | null;
		escolher: (v: string | null) => void;
		rotulo: string;
	} = $props();
</script>

<div class="fita" role="group" aria-label={rotulo}>
	{#each opcoes as o (o.valor ?? '')}
		<button type="button" class:ativo={valor === o.valor} aria-pressed={valor === o.valor}
			onclick={() => escolher(o.valor)}>
			{o.rotulo}<span class="n">{o.n}</span>
		</button>
	{/each}
</div>

<style>
	.fita { display: flex; gap: 0.35rem; overflow-x: auto; scrollbar-width: none;
		padding: 0.1rem 0 0.45rem; }
	.fita::-webkit-scrollbar { display: none; }
	button { flex: 0 0 auto; display: inline-flex; align-items: center; gap: 0.3rem;
		font: inherit; font-size: 0.74rem; font-weight: 600; color: var(--texto);
		background: var(--cartao, transparent); border: 1px solid var(--borda);
		border-radius: 999px; padding: 0.3rem 0.7rem; cursor: pointer; white-space: nowrap; }
	button:focus-visible { outline: 2px solid var(--acento); outline-offset: 1px; }
	button.ativo { background: var(--acento); border-color: var(--acento); color: var(--fundo); }
	/* o número é secundário ao nome, e diz-se com o tamanho e não com uma cor que se perca */
	.n { font-size: 0.62rem; font-weight: 500; }
</style>
