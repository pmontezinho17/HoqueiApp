<script lang="ts">
	/**
	 * A saída de emergência de quem **instalou** o site de um ramo no telemóvel.
	 *
	 * A porta do `_middleware.js` resolve quem abre o endereço no browser. Não resolve estes:
	 * com a app instalada, o *service worker* serve o ecrã da sua própria cache e o pedido
	 * nunca chega à Cloudflare. Essa pessoa podia ficar meses com uma app que mostra sempre os
	 * resultados do dia em que a instalou, sem nada que lho dissesse.
	 *
	 * Então isto faz três coisas, por esta ordem:
	 *
	 * 1. **Desregista o service worker e apaga as caches.** É o que desfaz a instalação: a
	 *    partir daqui a app deixa de abrir sem rede, e o próximo arranque bate na porta.
	 * 2. **Tira o site do caminho** — esconde o conteúdo por trás desta folha, para ninguém
	 *    continuar a ler resultados velhos enquanto decide.
	 * 3. **Aponta para o sítio certo**, com o mesmo caminho em que a pessoa estava.
	 *
	 * Não encaminha sozinho. O dono escolheu aviso e não encaminhamento a 10/10/2026, e numa
	 * app instalada a escolha é ainda mais defensável do que no browser: um salto automático
	 * para fora de uma app que alguém pôs no ecrã principal parece uma avaria.
	 *
	 * Em produção isto não existe — o `{#if}` no `+layout.svelte` nem o monta.
	 */
	import { onMount } from 'svelte';
	import { PRODUCAO, paraProducao } from '$lib/ambiente.js';

	let destino = $state(`https://${PRODUCAO}`);

	onMount(() => {
		destino = paraProducao(new URL(location.href));
		// `void` e não `await`: a folha tem de aparecer já, e a limpeza acontece por trás.
		// Se falhar — um browser sem `caches`, uma janela privada — o aviso fica na mesma,
		// que é a parte que importa.
		void (async () => {
			try {
				const registos = await navigator.serviceWorker?.getRegistrations?.();
				await Promise.all((registos ?? []).map((r) => r.unregister()));
			} catch {
				/* sem service worker, ou sem permissão: não há nada para desfazer */
			}
			try {
				const nomes = await caches.keys();
				await Promise.all(nomes.map((n) => caches.delete(n)));
			} catch {
				/* idem */
			}
		})();
	});
</script>

<div class="folha" role="alertdialog" aria-labelledby="t">
	<div class="cartao">
		<h1 id="t">Esta é a cópia de testes. Os resultados aqui estão parados.</h1>
		<p>
			Os jogos de hoje não aparecem nesta versão. O site a sério actualiza-se durante os
			jogos, de meio em meio minuto.
		</p>
		<a href={destino}>Ir para o OK4Sticks</a>
		<p class="morada">e guarda esta morada: <b>{PRODUCAO}</b></p>
	</div>
</div>

<style>
	/* por cima de tudo, incluindo o cabeçalho colado e a barra de baixo */
	.folha {
		position: fixed;
		inset: 0;
		z-index: 9999;
		display: grid;
		place-items: center;
		padding: 24px;
		background: var(--fundo);
	}
	.cartao {
		width: 100%;
		max-width: 26rem;
		padding: 28px 24px;
		border: 1px solid var(--borda);
		border-radius: 16px;
		background: var(--cartao);
	}
	h1 { font-size: 1.25rem; line-height: 1.25; margin: 0 0 10px; }
	p { margin: 0 0 20px; font-size: 0.9rem; color: var(--suave); line-height: 1.5; }
	a {
		display: flex; align-items: center; justify-content: center;
		min-height: 52px; padding: 0 18px;
		font-weight: 700; text-decoration: none;
		color: #fff; background: var(--acento); border-radius: 12px;
	}
	.morada { margin: 12px 0 0; text-align: center; font-size: 0.82rem; }
	.morada b { color: var(--texto); font-weight: 600; }
</style>
