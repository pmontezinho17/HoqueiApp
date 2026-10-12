<script lang="ts">
	/**
	 * A faixa que convida a pôr a app no ecrã principal. A decisão toda — e a razão de ela
	 * existir — vive em `convite.ts`; aqui só se desenha.
	 *
	 * **No topo e dentro do conteúdo, não flutuante.** As outras notas desta app — o aviso de
	 * versão, a caixa do que mudou — flutuam no fundo, e isso resolve-se bem quando há uma.
	 * Com duas ao mesmo tempo ficam uma por cima da outra, e as duas só coincidem na janela
	 * estreita que se segue a uma publicação. Aqui a faixa entra no fluxo da página: não
	 * precisa de `z-index`, não tapa nada, não briga com a bolha de opinião — e é também o
	 * sítio onde este género de dica costuma estar.
	 *
	 * **Dispensa-se, e a dispensa fica guardada no mesmo armazenamento que o iPhone apaga.**
	 * Ou seja: a quem o Safari limpar os dados, a faixa volta. Parece um defeito e é o
	 * comportamento certo — essa é exactamente a pessoa que ainda precisa de a ver.
	 */
	import { onMount } from 'svelte';
	import { CHAVE, decidirConvite, esteAparelho, type Convite } from './convite';
	import { APP_NOME } from './sitio';

	let convite = $state<Convite>('nada');

	onMount(() => {
		let dispensado = false;
		try {
			dispensado = localStorage.getItem(CHAVE) === '1';
		} catch {
			// armazenamento bloqueado: não se mostra. Uma faixa que não consegue guardar que
			// foi dispensada volta em cada abertura, e aí passa a ser o problema em vez da
			// solução — é a mesma regra do guia
			return;
		}
		const aparelho = esteAparelho(dispensado);
		if (aparelho) convite = decidirConvite(aparelho);
	});

	function dispensar() {
		convite = 'nada';
		try {
			localStorage.setItem(CHAVE, '1');
		} catch {
			/* sem armazenamento, vale para esta visita */
		}
	}
</script>

{#if convite !== 'nada'}
	<aside class="convite">
		<p>
			{#if convite === 'instalar'}
				<strong>Guarda o {APP_NOME} no ecrã principal.</strong> No Safari, toca em
				Partilhar e depois em <strong>Adicionar ao ecrã principal</strong>. Sem isso, o
				iPhone apaga as tuas equipas depois de uma semana sem abrires a aplicação.
			{:else}
				<strong>Abre esta página no Safari.</strong> Dentro de outra aplicação o iPhone
				não guarda as tuas escolhas de uma vez para a outra. Toca em Partilhar e depois
				em <strong>Abrir no Safari</strong>.
			{/if}
		</p>
		<button type="button" onclick={dispensar} aria-label="Dispensar este aviso">✕</button>
	</aside>
{/if}

<style>
	.convite {
		display: flex;
		align-items: flex-start;
		gap: var(--e-2);
		margin: 0 0 var(--e-3);
		padding: var(--e-2) var(--e-3);
		border: 1px solid var(--borda);
		border-left: 3px solid var(--acento);
		border-radius: 10px;
		background: var(--cartao);
	}
	p {
		margin: 0;
		font-size: var(--t-micro);
		line-height: 1.5;
		color: var(--texto-2);
	}
	strong { color: var(--texto); font-weight: 600; }
	/* 44px de alvo sem 44px de caixa: o botão é pequeno à vista e grande ao toque, que é o que
	   as outras dispensas desta app fazem */
	button {
		flex: 0 0 auto;
		min-width: 44px;
		min-height: 44px;
		margin: calc(var(--e-2) * -1) calc(var(--e-2) * -1) 0 0;
		padding: 0;
		font: inherit;
		line-height: 1;
		color: var(--suave);
		background: none;
		border: 0;
		cursor: pointer;
	}
</style>
