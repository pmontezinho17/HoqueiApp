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
		<dd>
			Pelo Artigo 7.º do regulamento da associação: primeiro os jogos entre as equipas
			empatadas, depois a diferença de golos na prova e, por fim, o rácio entre marcados e
			sofridos. Os jogos entre as empatadas só contam quando já se realizaram todos — a
			meio da época ainda falta metade, e usá-los aí dizia mais sobre o calendário do que
			sobre as equipas.
		</dd>
		<dt>Que jogos entram</dt>
		<dd>
			Só os da fase de grupos, e só depois de terminarem — um jogo a decorrer não conta
			para a tabela enquanto não acabar.
		</dd>
	</dl>
	<p class="nota">
		A contagem dos pontos não foi assumida: foi apurada contra as 42 tabelas que a
		associação publica nos outros escalões, e o mesmo cálculo reproduz todas elas, linha por
		linha. Continuamos a verificar isso a cada actualização — se a associação mudar de
		regra, ficamos a saber no dia seguinte em vez de publicar tabelas erradas em silêncio.
	</p>
	<p class="nota">
		O desempate é o único ponto em que seguimos o regulamento e não a associação. Nas
		tabelas que ela publica, duas equipas empatadas em tudo o resto ficam ordenadas por
		golos marcados; o regulamento manda ver o rácio, que às vezes dá o contrário. Como
		aqui só calculamos onde ela não publica nada, seguimos o que está escrito.
	</p>
	<p class="nota">
		Não calculamos tabelas para as Supertaças nem para os torneios de pré-época: são
		eliminatórias e jogos-treino, e ali uma classificação não quer dizer nada.
	</p>
</section>

<section>
	<h2>Mérito da Formação</h2>
	<p>
		Nos Encontros Distritais de Escolares e de Benjamins há uma segunda tabela, que
		<strong>não é a classificação</strong>: o escalonamento de Mérito da Formação, do Artigo
		92.º do regulamento da associação. Ela premeia o contrário do que uma tabela costuma
		premiar — levar a equipa completa e pôr toda a gente a jogar.
	</p>
	<dl>
		<dt>O que dá pontos</dt>
		<dd>
			1 ponto por cada atleta que entra em jogo, 3 à equipa que marca mais golos (1 a cada
			uma no empate) e 1 pela equipa completa, com 2 guarda-redes e 8 jogadores de campo.
		</dd>
		<dt>O que tira pontos</dt>
		<dd>
			Apresentar menos de 8 atletas, levar um só guarda-redes, e pôr um atleta a jogar três
			meias partes ou as quatro — o regulamento parte estes jogos em quatro meias partes e
			obriga a que cada atleta faça uma inteira de cada parte.
		</dd>
		<dt>De onde vêm os números</dt>
		<dd>
			Do boletim oficial de cada jogo, que a associação publica e onde está marcado quem
			entrou em cada meia parte. Nunca publicamos essa grelha: dela só sai o total da
			equipa.
		</dd>
	</dl>
	<p class="nota">
		<strong>Também não é oficial.</strong> A pontuação que conta é preenchida pelos delegados
		na Folha de Controlo de Jogo, em papel, e validada pelo Comité Técnico da associação.
		Há ainda uma penalização que não conseguimos aplicar sozinhos: quando um atleta faz um
		só período, o regulamento não penaliza se tiver havido lesão comprovada pelo árbitro, e
		essa justificação só existe no papel. Nesses jogos assinalamos e não descontamos.
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
