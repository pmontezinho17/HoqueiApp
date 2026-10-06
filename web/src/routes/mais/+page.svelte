<script lang="ts">
	/**
	 * A ficha técnica da app: de onde vêm os dados, quantos são, e de quando.
	 *
	 * **Era um ecrã com cinco blocos** — isto, o aviso de site não oficial, o guia, um resumo
	 * de privacidade e os nomes de atletas — porque o ⋮ vinha directo para cá e tudo o que
	 * não tinha casa acabava aqui. Desde 06/10/2026 o ⋮ abre um menu: o guia é uma linha lá,
	 * a privacidade é uma linha lá, e os nomes de atletas estavam a repetir em resumo o que a
	 * `/privacidade` já diz por extenso, com o compromisso e o endereço. Dois textos a dizer
	 * o mesmo divergem no dia em que um deles mudar.
	 *
	 * Fica o que é só desta página: a fonte e os números.
	 */
	let { data } = $props();

	const quando = $derived(
		new Date(data.meta.generated_at).toLocaleString('pt-PT', {
			dateStyle: 'long', timeStyle: 'short'
		})
	);
</script>

<svelte:head><title>Sobre — Hóquei em Patins</title></svelte:head>

<h1>Sobre a app e os dados</h1>

<section>
	<h2>Dados</h2>
	<p>
		Resultados, calendários e classificações das competições da
		<strong>Associação de Patinagem de Lisboa</strong>.
	</p>
	<dl>
		<dt>Últimos dados novos</dt><dd>{quando}</dd>
		<dt>Competições</dt><dd>{data.meta.competicoes}</dd>
		<dt>Jogos</dt><dd>{data.meta.jogos}</dd>
		<dt>Fichas de jogo</dt><dd>{data.meta.fichas_publicadas}</dd>
	</dl>
	<p class="nota">
		Actualizado automaticamente de duas em duas horas aos fins de semana e de seis em
		seis nos dias úteis, e só quando há jogos novos.
	</p>
</section>

<section>
	<h2>Este site não é oficial</h2>
	<p>
		Não tem qualquer ligação à Associação de Patinagem de Lisboa nem à Federação de
		Patinagem de Portugal. Os dados são recolhidos da
		<a href={data.meta.fonte} rel="noreferrer">plataforma pública da associação</a>
		e republicados tal como lá aparecem.
	</p>
</section>

<style>
	h1 { font-size: 1.05rem; margin: 0 0 1rem; }
	section { margin-bottom: 1.5rem; }
	h2 { font-size: 0.68rem; color: var(--acento); letter-spacing: 0.05em;
		margin: 0 0 0.35rem; font-weight: 600; }
	p { font-size: 0.82rem; margin: 0 0 0.5rem; line-height: 1.5; }
	.nota { font-size: 0.72rem; color: var(--suave); }
	dl { display: grid; grid-template-columns: 1fr auto; gap: 0 0.5rem;
		margin: 0.5rem 0; font-size: 0.78rem; }
	dt { color: var(--suave); border-bottom: 1px solid var(--borda); padding: 0.3rem 0; }
	dd { margin: 0; text-align: right; font-variant-numeric: tabular-nums;
		border-bottom: 1px solid var(--borda); padding: 0.3rem 0; }
</style>
