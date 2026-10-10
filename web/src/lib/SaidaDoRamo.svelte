<script lang="ts">
	/**
	 * A saída de quem **instalou** o site de um ramo no telemóvel — e a entrada de quem tem a
	 * chave.
	 *
	 * A porta do `_middleware.js` resolve quem abre o endereço no browser. Não resolve estes:
	 * com a app instalada, o *service worker* serve o ecrã da sua própria cache e o pedido
	 * nunca chega à Cloudflare. Essa pessoa podia ficar meses com uma app que mostra sempre os
	 * resultados do dia em que a instalou, sem nada que lho dissesse.
	 *
	 * **A caixa da chave foi esquecida na primeira versão, e o dono bateu nela.** A 10/10/2026
	 * ele definiu a `CHAVE_TESTES`, abriu o site de testes e deu de caras com este aviso — que
	 * é servido pela cache do telemóvel dele, nunca chega ao servidor, e não tinha entrada
	 * nenhuma. Desenhei isto a pensar só em quem se engana no endereço e esqueci-me de que
	 * apanha na mesma quem tem a chave. Não havia maneira de entrar; só havia maneira de sair.
	 *
	 * Então faz quatro coisas:
	 *
	 * 1. **Desregista o service worker e apaga as caches**, sempre, mesmo a quem tem a chave:
	 *    é o que desfaz a instalação e impede que um site de ramo viva como app num telemóvel.
	 * 2. **Cala-se** se a marca do cookie disser que esta pessoa já passou a porta.
	 * 3. Senão, **tira o site do caminho** — ninguém continua a ler resultados velhos enquanto
	 *    decide.
	 * 4. E dá os dois caminhos: o site a sério, com o mesmo caminho em que a pessoa estava, e
	 *    a caixa da chave para quem é de casa.
	 *
	 * Não encaminha sozinho. O dono escolheu aviso e não encaminhamento a 10/10/2026, e numa
	 * app instalada a escolha é ainda mais defensável do que no browser: um salto automático
	 * para fora de uma app que alguém pôs no ecrã principal parece uma avaria.
	 *
	 * Em produção isto não existe — o `{#if}` no `+layout.svelte` nem o monta.
	 */
	import { onMount } from 'svelte';
	import { PRODUCAO, paraProducao, temChaveDoRamo } from '$lib/ambiente.js';

	let destino = $state(`https://${PRODUCAO}`);
	let mostrar = $state(false);
	let aEntrar = $state(false);
	let chave = $state('');

	/**
	 * Desfaz a instalação. **Devolve uma promessa e quem entra espera por ela**: sem isso, a
	 * navegação com a chave era servida outra vez pelo service worker que ainda lá estava, e
	 * o pedido nunca chegava à porta — a pessoa carregava em Entrar e via este mesmo ecrã.
	 */
	async function desinstalar() {
		try {
			const registos = await navigator.serviceWorker?.getRegistrations?.();
			await Promise.all((registos ?? []).map((r) => r.unregister()));
		} catch {
			/* sem service worker, ou sem permissão: não há nada para desfazer */
		}
		try {
			await Promise.all((await caches.keys()).map((n) => caches.delete(n)));
		} catch {
			/* idem */
		}
	}

	onMount(() => {
		destino = paraProducao(new URL(location.href));
		mostrar = !temChaveDoRamo(document.cookie);
		// `void`: o ecrã tem de aparecer já, e a limpeza acontece por trás
		void desinstalar();
	});

	async function entrar(e: Event) {
		e.preventDefault();
		const v = chave.trim();
		if (!v || aEntrar) return;
		aEntrar = true;
		await desinstalar();              // ver `desinstalar`: sem isto a chave não chega lá
		const u = new URL(location.href);
		u.searchParams.set('chave', v);
		location.replace(u.toString());
	}
</script>

{#if mostrar}
	<div class="folha" role="alertdialog" aria-labelledby="t">
		<div class="cartao">
			<h1 id="t">Esta é a cópia de testes. Os resultados aqui estão parados.</h1>
			<p>
				Os jogos de hoje não aparecem nesta versão. O site a sério actualiza-se durante os
				jogos, de meio em meio minuto.
			</p>
			<a href={destino}>Ir para o OK4Sticks</a>
			<p class="morada">e guarda esta morada: <b>{PRODUCAO}</b></p>

			<details>
				<summary>Sou eu, deixa-me entrar</summary>
				<form onsubmit={entrar}>
					<label for="k">Chave</label>
					<!-- svelte-ignore a11y_autofocus -->
					<input
						id="k" type="password" bind:value={chave} autocomplete="off"
						autocapitalize="off" spellcheck="false" placeholder="chave do site de testes" />
					<button type="submit" disabled={aEntrar}>
						{aEntrar ? 'A entrar…' : 'Entrar'}
					</button>
				</form>
			</details>
		</div>
	</div>
{/if}

<style>
	/* por cima de tudo, incluindo o cabeçalho colado e a barra de baixo */
	.folha {
		position: fixed;
		inset: 0;
		z-index: 9999;
		display: grid;
		place-items: center;
		padding: 24px;
		overflow-y: auto;
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

	details { margin-top: 22px; border-top: 1px solid var(--borda); padding-top: 12px; }
	summary {
		cursor: pointer; color: var(--suave); font-size: 0.8rem;
		min-height: 44px; display: flex; align-items: center;
	}
	label { display: block; font-size: 0.76rem; color: var(--suave); margin: 4px 0 6px; }
	input {
		width: 100%; box-sizing: border-box; padding: 11px 12px; font: inherit;
		color: var(--texto); background: var(--fundo);
		border: 1px solid var(--borda); border-radius: 9px;
	}
	input:focus { outline: 2px solid var(--acento); outline-offset: 1px; }
	button {
		width: 100%; margin-top: 10px; padding: 12px; font: inherit; font-weight: 600;
		min-height: 44px; color: #fff; background: var(--acento);
		border: 0; border-radius: 9px; cursor: pointer;
	}
	button:disabled { opacity: 0.6; cursor: default; }
</style>
