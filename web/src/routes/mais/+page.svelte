<script lang="ts">
	let { data } = $props();
	const CONTACTO = 'pedro.montezinho@gmail.com';
	const quando = $derived(
		new Date(data.meta.generated_at).toLocaleString('pt-PT', {
			dateStyle: 'long', timeStyle: 'short'
		})
	);
</script>

<svelte:head><title>Mais — Hóquei em Patins</title></svelte:head>

<h1>Sobre</h1>

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

<section>
	<h2>Privacidade</h2>
	<p>
		Sem conta, sem cookies, sem rastreio: os favoritos ficam no teu telemóvel e nunca nos
		chegam. <a href="/privacidade">Ler a política de privacidade</a>, que diz também como
		pedir a remoção de um nome.
	</p>

	<h2>Nomes de atletas</h2>
	<p>
		As fichas de jogo incluem nomes de atletas em todos os escalões, incluindo os de
		formação, tal como a fonte os apresenta.
	</p>
	<p>
		Para pedir a remoção de um nome,
		<a href={`mailto:${CONTACTO}?subject=hoquei.pages.dev`}>escreve-nos</a>.
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
