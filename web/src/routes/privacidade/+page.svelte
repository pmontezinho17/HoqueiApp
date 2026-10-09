<script lang="ts">
	/**
	 * L7.4 — política de privacidade.
	 *
	 * Escrita a partir de uma auditoria ao código, e não de memória: zero cookies, zero
	 * `sessionStorage`, zero rastreio, zero tipos de letra externos, e **três** chaves
	 * possíveis em `localStorage` — nenhuma delas com nada que identifique uma pessoa. Se
	 * alguma destas coisas mudar, esta página tem de mudar no mesmo commit — é a única forma
	 * de continuar verdadeira.
	 *
	 * Ela já esteve errada: dizia "uma única chave" e eram duas. O guia passou a guardar
	 * `guia-visto` a 06/10/2026 e esta página não foi corrigida no mesmo commit, que é
	 * exactamente o que esta regra existe para impedir. Corrigido a 06/10/2026, com a
	 * terceira chave — a do tema — no mesmo commit em que ela nasceu.
	 */
	import { CONTACTO } from '$lib/contacto';
	import { SITIO_NOME, APP_NOME } from '$lib/sitio';
	const ACTUALIZADA = '6 de outubro de 2026';
</script>

<svelte:head><title>Privacidade — {APP_NOME}</title></svelte:head>

<h1>Privacidade</h1>
<p class="resumo">
	Esta aplicação <strong>não tem conta, não tem servidor e não te segue</strong>. Os teus
	favoritos ficam no teu telemóvel e nunca nos chegam. O que publicamos são os dados que a
	Associação de Patinagem de Lisboa já publica no seu site.
</p>

<section>
	<h2>O que fica guardado, e onde</h2>
	<dl>
		<dt>As tuas equipas seguidas</dt>
		<dd>
			No armazenamento do teu próprio browser, numa chave chamada
			<code>hoquei:favoritos:v1</code>. É o clube e o escalão, mais nada.
			<strong>Não sai do aparelho</strong> e não temos forma de o ler. Apagas limpando os
			dados do site, ou deixando de seguir as equipas.
		</dd>
		<dt>Se já viste o guia</dt>
		<dd>
			Numa chave chamada <code>hoquei:guia-visto:v2</code>, para a apresentação dos ecrãs
			não voltar a aparecer sozinha. É um sim ou não, mais nada. Quando o guia mudar o
			suficiente para valer a pena mostrá-lo outra vez, o número sobe e ele reaparece uma
			única vez.
		</dd>
		<dt>Uma data, para não te contarmos duas vezes</dt>
		<dd>
			Numa chave chamada <code>hoquei:contado:v1</code>, com a data de hoje, e outra com um
			sim/não em <code>hoquei:conhecido:v1</code>. Servem para o teu aparelho avisar o
			contador <strong>uma vez por dia</strong> em vez de a cada abertura. Não há ali
			nenhum número que te identifique, e é por isso que nós conseguimos saber que
			"hoje abriram isto catorze aparelhos" e <strong>não</strong> conseguimos saber que
			"este aparelho abriu nove dias seguidos" — para isso seria preciso um
			identificador, e não existe nenhum.
		</dd>
		<dt>O tema, se o escolheres à mão</dt>
		<dd>
			Numa chave chamada <code>hoquei:tema:v1</code>, com a palavra
			<code>claro</code> ou <code>escuro</code>. Enquanto seguires o tema do sistema
			<strong>não fica nada escrito</strong>: a chave só nasce se discordares dele.
		</dd>
		<dt>A consola de manutenção — só se fores tu a abri-la</dt>
		<dd>
			Em duas chaves, <code>ok4sticks:consola:chave</code> e
			<code>ok4sticks:consola:tema</code>. Existem <strong>apenas</strong>
			em quem abra a consola de manutenção em <code>/consola</code> e lá cole a chave de
			acesso — uma página que não faz parte da aplicação e a que ninguém chega a usá-la
			normalmente. Se nunca abriste essa página, estas chaves não existem no teu aparelho.
			Guardam a chave de acesso, para não ter de ser escrita outra vez, e o tema escolhido
			nessa página. Nada mais.
		</dd>
		<dt>Uma cópia dos jogos, para funcionar sem rede</dt>
		<dd>
			A aplicação guarda os ficheiros que já leu, para abrir depressa num pavilhão com má
			rede. Fica no teu aparelho e desaparece quando limpas os dados do site.
		</dd>
	</dl>
</section>

<section>
	<h2>O que não fazemos</h2>
	<ul class="nao">
		<li>Não há conta, registo nem início de sessão.</li>
		<li>Não usamos <em>cookies</em>.</li>
		<li>
			Não há Google Analytics, nem a Web Analytics da Cloudflare, nem qualquer ferramenta
			de medição de terceiros. A única contagem que existe é nossa, não corre no teu
			telemóvel, e está descrita a seguir.
		</li>
		<li>
			Não carregamos tipos de letra nem código de terceiros — usamos as letras do teu
			próprio sistema.
		</li>
		<li>Não vendemos nem partilhamos dados com ninguém. Não temos dados para ceder.</li>
		<li>Não há publicidade.</li>
	</ul>
</section>

<section>
	<h2>O que o alojamento vê</h2>
	<p>
		O site é servido pela <strong>Cloudflare Pages</strong>. Como qualquer servidor na
		internet, a Cloudflare recebe o teu endereço IP e o tipo de browser para te poder
		responder, e guarda registos técnicos por pouco tempo. Isso não passa por nós, e não
		temos acesso a nada que identifique quem visita.
	</p>
</section>

<section>
	<h2>A única contagem que fazemos</h2>
	<p>
		Queremos saber se alguém usa isto, e quais os ecrãs que valem a pena melhorar. Desde
		<strong>6 de outubro de 2026</strong> contamos, <strong>no servidor</strong>, duas coisas:
	</p>
	<dl>
		<dt>Quantos ecrãs foram abertos por dia, por <em>tipo</em> de ecrã</dt>
		<dd>
			"jogos do dia", "o meu clube", "uma equipa", "um jogo". <strong>Agregado</strong>:
			fica registado que alguém abriu uma página de equipa, não <em>qual</em> equipa.
		</dd>
		<dt>Quantas vezes a aplicação foi aberta ou actualizada</dt>
		<dd>
			Contado por amostragem — um em cada dez pedidos — e o número que vemos é uma
			estimativa.
		</dd>
	</dl>
	<dl>
		<dt>Quantos aparelhos distintos abriram a aplicação, por dia</dt>
		<dd>
			E destes, quantos a abriam pela primeira vez. É o teu próprio aparelho que decide
			se já foi contado hoje, guardando uma data — ver acima. São <strong>aparelhos</strong>
			e não pessoas: o telemóvel e o computador da mesma pessoa contam dois.
		</dd>
	</dl>
	<p>
		O que isto <strong>não</strong> inclui, e não é por acaso: nenhum endereço IP, nenhum
		identificador, nenhum cookie, nenhuma sessão, nada que ligue duas visitas à mesma
		pessoa ou ao mesmo telemóvel. Se abrires a aplicação cinco vezes, o contador diz cinco
		e não tem forma de saber que foste tu. Também não corre nada no teu telemóvel para isto
		acontecer: é um contador do lado de quem serve as páginas, e é por isso que continua a
		ser verdade que não carregamos código de terceiros.
	</p>
	<p class="nota">
		Os números ficam guardados <strong>120 dias</strong> e apagam-se sozinhos. São
		contadores, não um registo de visitas: o que existe é "a 6 de outubro abriram-se 14
		páginas de equipa", e mais nada.
	</p>
</section>

<section>
	<h2>Nomes de atletas — a parte séria</h2>
	<p>
		As fichas de jogo que republicamos incluem <strong
			>nomes de atletas em todos os escalões, incluindo os de formação</strong
		>, tal como a fonte os apresenta. A decisão foi tomada por já serem públicos no site da
		associação.
	</p>
	<p>
		Dizemos isto com franqueza: <strong
			>"já é público" não é o mesmo que "pode ser republicado"</strong
		>. Juntar estes dados num sítio novo, pesquisável e agregado é um tratamento diferente
		do original, e a protecção é reforçada quando se trata de menores.
	</p>
	<p class="compromisso">
		Por isso o compromisso é simples e sem condições: <strong
			>se pedires que um nome saia, sai</strong
		> — o teu, ou o de um filho ou filha de quem sejas responsável. Não pedimos justificação
		e não discutimos o pedido. Basta escreveres para
		<a href={`mailto:${CONTACTO}?subject=Remover nome — ${SITIO_NOME}`}>{CONTACTO}</a>.
	</p>
	<p>
		O mecanismo para omitir todos os nomes dos escalões de formação está construído e
		testado, e pode ser ligado de uma vez. A associação foi contactada a 1 de outubro de
		2026 sobre este assunto, entre outros.
	</p>
</section>

<section>
	<h2>Quando carregas em botões que saem daqui</h2>
	<dl>
		<dt>"Adicionar ao calendário"</dt>
		<dd>
			Abre o Google Calendar ou o calendário do teu telefone. A partir daí estás nas mãos
			desse serviço e das regras de privacidade dele — nós só fornecemos os dados do jogo.
			Se subscreveres o calendário de uma equipa, quem te serve o calendário (a Google, por
			exemplo) passa a ir buscar esse endereço periodicamente.
		</dd>
		<dt>Ligações para a fonte</dt>
		<dd>Levam-te ao site da Associação de Patinagem de Lisboa, que tem regras próprias.</dd>
		<dt>"Escreve-nos" e o botão de opinião</dt>
		<dd>
			Abrem o teu programa de email com o texto já escrito. <strong>Nada sai do teu
			aparelho sem seres tu a carregar em enviar</strong>, e o que vai junto — o ecrã em
			que estavas e a data dos dados — está à vista no corpo da mensagem antes de a
			enviares. Não há servidor nenhum a receber opiniões.
		</dd>
	</dl>
</section>

<section>
	<h2>Notificações</h2>
	<p>
		<strong>Ainda não existem.</strong> Quando existirem, esta página muda antes de elas
		funcionarem, porque aí haverá a primeira coisa guardada fora do teu aparelho: um
		endereço de subscrição que o teu browser gera, necessário para te enviar o aviso. Serão
		sempre opcionais, e desligá-las apaga esse registo.
	</p>
</section>

<section>
	<h2>Site não oficial</h2>
	<p>
		Não temos ligação à Associação de Patinagem de Lisboa nem à Federação de Patinagem de
		Portugal. É um projecto feito por adeptos, sem fins comerciais, e os dados são da
		associação.
	</p>
</section>

<p class="rodape">
	Actualizada a {ACTUALIZADA}. Dúvidas ou pedidos:
	<a href={`mailto:${CONTACTO}?subject=Privacidade — ${SITIO_NOME}`}>{CONTACTO}</a>.
</p>

<style>
	h1 {
		font-size: 1.1rem;
		margin: 0 0 0.6rem;
	}
	.resumo {
		font-size: 0.86rem;
		line-height: 1.5;
		margin: 0 0 1.4rem;
		padding: 0.7rem 0.8rem;
		border-radius: 10px;
		border: 1px solid var(--acento);
		background: var(--acento-fraco);
	}

	section {
		margin-bottom: 1.4rem;
	}
	h2 {
		font-size: 0.72rem;
		margin: 0 0 0.5rem;
		color: var(--suave);
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	p {
		font-size: 0.82rem;
		line-height: 1.55;
		margin: 0 0 0.6rem;
	}

	dl {
		margin: 0;
	}
	dt {
		font-size: 0.82rem;
		font-weight: 600;
		margin-top: 0.6rem;
	}
	dd {
		font-size: 0.8rem;
		line-height: 1.5;
		margin: 0.2rem 0 0;
	}

	ul.nao {
		margin: 0;
		padding-left: 1.1rem;
		font-size: 0.82rem;
		line-height: 1.6;
	}

	/* o detalhe que não é promessa nem aviso: recua um grau */
	.nota {
		font-size: var(--t-micro);
		color: var(--suave);
	}
	.compromisso {
		padding: 0.7rem 0.8rem;
		border-radius: 10px;
		background: var(--aviso-fundo);
		color: var(--aviso);
	}
	.compromisso a {
		color: inherit;
	}

	code {
		font-size: 0.74rem;
		padding: 0.05rem 0.25rem;
		border-radius: 4px;
		background: var(--cartao);
		border: 1px solid var(--borda);
	}
	a {
		color: var(--acento);
	}
	.rodape {
		font-size: 0.72rem;
		color: var(--suave);
		border-top: 1px solid var(--borda);
		padding-top: 0.8rem;
	}
</style>
