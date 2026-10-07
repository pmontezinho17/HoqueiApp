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
	 * Fica o que é só desta página: a fonte e os números — e, desde 07/10/2026, a explicação
	 * das classificações que calculamos. Ela estava numa caixa de aviso por cima de cada
	 * tabela e o dono apanhou-a no telemóvel: o amarelo afastava a atenção da tabela, que é o
	 * que a pessoa foi ver. Debaixo das tabelas ficou uma nota de uma linha que aponta para
	 * cá; o porquê por extenso é aqui.
	 */
	import { APP_NOME } from '$lib/sitio';

	let { data } = $props();

	const quando = $derived(
		new Date(data.meta.generated_at).toLocaleString('pt-PT', {
			dateStyle: 'long', timeStyle: 'short'
		})
	);
</script>

<svelte:head><title>Sobre — {APP_NOME}</title></svelte:head>

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
	<h2>Classificações que calculamos</h2>
	<p>
		A associação <strong>não publica classificação</strong> nos Escolares nem nos Benjamins.
		São 8 séries e 43 equipas, e quem acompanha um filho nesses escalões andava a fazer as
		contas à mão — por isso calculamo-las nós, e dizemo-lo em cada uma delas.
	</p>
	<p>
		<strong>Não são oficiais.</strong> Se alguma vez houver diferença entre o que aqui está e
		o que a associação disser, o que vale é o dela.
	</p>
	<dl>
		<dt>Como se contam os pontos</dt>
		<dd>Vitória 3, empate 1, derrota 0.</dd>
		<dt>Como se desempata</dt>
		<dd>Diferença de golos e, depois, golos marcados.</dd>
		<dt>Que jogos entram</dt>
		<dd>
			Só os da fase de grupos, e só depois de terminarem — um jogo a decorrer não conta
			para a tabela enquanto não acabar.
		</dd>
	</dl>
	<p class="nota">
		Estas regras não foram assumidas: foram apuradas contra as 42 tabelas que a associação
		publica nos outros escalões, e o mesmo cálculo reproduz todas elas, linha por linha.
		Continuamos a verificar isso a cada actualização — se a associação mudar de regra,
		ficamos a saber no dia seguinte em vez de publicar tabelas erradas em silêncio.
	</p>
	<p class="nota">
		Não calculamos tabelas para as Supertaças nem para os torneios de pré-época: são
		eliminatórias e jogos-treino, e ali uma classificação não quer dizer nada.
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
