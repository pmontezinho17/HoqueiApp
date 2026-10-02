<script lang="ts">
	import { useRegisterSW } from 'virtual:pwa-register/svelte';

	/**
	 * Regista o service worker **e** mostra o aviso de versão nova.
	 *
	 * Isto não existia, e a falta dava-se mal com a configuração: o `registerType: 'prompt'`
	 * deixa a versão nova à espera até alguém lhe mandar `SKIP_WAITING`, e não havia ninguém
	 * para o fazer. Pior: no SvelteKit o `registerSW.js` não é injectado sozinho no HTML, por
	 * isso o service worker **nunca era sequer registado** em produção — sem offline, e sem o
	 * browser reconhecer a app como instalável.
	 */
	const { needRefresh, updateServiceWorker } = useRegisterSW();
</script>

{#if $needRefresh}
	<div class="aviso" role="status">
		<p>Há uma versão nova da aplicação.</p>
		<div class="accoes">
			<button class="principal" onclick={() => updateServiceWorker()}>Actualizar</button>
			<button onclick={() => ($needRefresh = false)}>Agora não</button>
		</div>
	</div>
{/if}

<style>
	.aviso {
		position: fixed; z-index: 50; left: 0.8rem; right: 0.8rem;
		bottom: calc(0.8rem + env(safe-area-inset-bottom));
		display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
		gap: 0.6rem; padding: 0.7rem 0.9rem; font-size: 0.8rem;
		border: 1px solid var(--borda); border-radius: 12px;
		background: var(--cartao); color: var(--texto);
		box-shadow: 0 6px 24px rgb(0 0 0 / 0.18);
	}
	p { margin: 0; }
	.accoes { display: flex; gap: 0.4rem; }
	button {
		min-height: 44px; padding: 0 0.8rem; font: inherit; cursor: pointer;
		border-radius: 999px; border: 1px solid var(--borda);
		background: none; color: var(--suave);
	}
	.principal { border-color: var(--acento); color: var(--acento); font-weight: 600; }
</style>
