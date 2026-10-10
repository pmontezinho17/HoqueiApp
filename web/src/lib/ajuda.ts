/**
 * As perguntas frequentes, em dados e não dentro do componente.
 *
 * **Estão aqui para poderem ser testadas.** O risco de um FAQ não é escrevê-lo: é ele
 * apodrecer sem ninguém notar. Metade destas respostas aponta para outras páginas da app, e
 * um `href` que deixe de existir depois de uma rota ser renomeada dá um link morto numa
 * página que ninguém relê. O teste ao lado percorre todas as respostas e confirma que cada
 * caminho interno é uma rota a sério.
 *
 * O endereço de contacto vem do `contacto.ts` e não escrito à mão, pela razão que está lá
 * dentro: três cópias de um endereço garantem que uma fica atrás numa troca.
 */
import { CONTACTO } from './contacto';

export type Pergunta = {
	/** a pergunta como uma pessoa a faria, e não como um título de secção */
	p: string;
	/** a resposta, com `<br>` e links; é conteúdo nosso, nunca de fora */
	r: string;
};

export const PERGUNTAS: Pergunta[] = [
	{
		p: 'De quanto em quanto tempo é que os resultados actualizam?',
		r: `Durante um jogo, de meio em meio minuto. Fora dos jogos, de poucas em poucas
		    horas. E num dia sem jogos não vamos buscar nada — não há nada para buscar.
		    <br><br>A hora exacta da última actualização está sempre em
		    <a href="/mais">Sobre a app e os dados</a>, e é essa que manda: se um resultado
		    parecer atrasado, essa hora diz-te se o atraso é nosso.`
	},
	{
		p: 'Isto é oficial?',
		r: `Não. Esta app não tem qualquer ligação à Associação de Patinagem de Lisboa nem
		    à Federação. É um projecto pessoal que lê o que a associação publica e o mostra
		    de outra maneira. O que é oficial é a fonte, não isto.`
	},
	{
		p: 'Falta um jogo, ou um resultado está errado. Porquê?',
		r: `Porque mostramos o que a fonte publica, tal como lá está. Não corrigimos
		    resultados nem acrescentamos jogos: se a ficha oficial ainda não foi fechada, o
		    jogo aparece aqui sem resultado.
		    <br><br>Se vires algo que te pareça errado,
		    <a href="mailto:${CONTACTO}">escreve-nos</a> — às vezes o erro é nosso, na
		    forma como lemos a página, e isso conseguimos corrigir.`
	},
	{
		p: 'Porque é que a classificação dos Escolares e dos Benjamins diz "não oficial"?',
		r: `Porque nesses escalões a fonte não publica classificação nenhuma, e nós
		    calculamo-la a partir dos resultados. A conta é simples e está explicada em
		    <a href="/mais">Sobre a app e os dados</a> — mas, como não é a conta oficial de
		    ninguém, não lhe podíamos dar o mesmo peso. Daí o rótulo.`
	},
	{
		p: 'Nos Escolares e Benjamins há uma tabela de "Mérito". O que é?',
		r: `É outra coisa, e não a classificação. O regulamento da associação tem um
		    escalonamento de Mérito da Formação que premeia levar a equipa completa e pôr
		    toda a gente a jogar: cada atleta que entra vale 1 ponto e ganhar o jogo vale 3.
		    Uma equipa que perca todos os jogos pode estar à frente.
		    <br><br>O que dá e o que tira pontos está por extenso em
		    <a href="/mais">Sobre a app e os dados</a>. Como a classificação, também não é
		    oficial: a que conta é preenchida em papel e validada pelo Comité Técnico.`
	},
	{
		p: 'Como escolho as minhas equipas, e como as mudo depois?',
		r: `Em <a href="/clube">O Meu Clube</a>. Escolhes o clube pelo emblema e depois os
		    escalões que queres seguir. Para mudar, voltas ao mesmo sítio — podes seguir
		    vários clubes ao mesmo tempo.`
	},
	{
		p: 'Dá para instalar no telemóvel?',
		r: `Dá, e não precisa de loja nenhuma. No iPhone, no Safari: Partilhar →
		    "Adicionar ao ecrã principal". No Android, no Chrome: menu → "Instalar
		    aplicação". Fica com ícone próprio e abre sem a barra do browser.`
	},
	{
		p: 'Funciona sem rede?',
		r: `Funciona com o que já tiveres lido. O que abriste antes fica guardado no
		    aparelho e volta a aparecer — útil num pavilhão com rede fraca. O que nunca
		    abriste não aparece, e os resultados só mexem quando houver rede outra vez.`
	},
	{
		p: 'Recebo notificação quando a minha equipa marca?',
		r: `Ainda não. É das coisas que queremos e não é das mais simples — exige guardar
		    quem quer ser avisado de quê, e isso ainda não existe. Entretanto, com a app
		    aberta numa janela de jogos, os resultados mexem sozinhos sem ser preciso
		    recarregar.`
	},
	{
		p: 'Porque é que aparecem nomes de atletas de formação?',
		r: `Porque constam das fichas oficiais que a associação publica, e esta app
		    republica o que lá está. Foi uma decisão pensada e tem um limite claro: qualquer
		    pessoa pode pedir a remoção de um nome, sem ter de justificar, e nós removemos.
		    <br><br>O compromisso por extenso, e como pedir, está na
		    <a href="/privacidade">política de privacidade</a>.`
	},
	{
		p: 'O que são as séries A, B, C de um campeonato?',
		r: `São grupos dentro da mesma prova — o campeonato regional de um escalão
		    divide-se em várias séries, cada uma com o seu calendário e a sua
		    classificação. Na app, uma prova com séries abre com todas à mão, e cada
		    equipa aparece na sua.`
	},
	{
		p: 'O meu clube aparece com o nome estranho, ou duas vezes. Porquê?',
		r: `Porque o nome está escrito de maneiras diferentes nas páginas da fonte — às
		    vezes com um espaço a mais, às vezes abreviado. Nós juntamos o que
		    conseguimos reconhecer, mas alguns escapam.
		    <br><br>Se vires o teu clube repetido,
		    <a href="mailto:${CONTACTO}">diz-nos qual é</a>: cada caso que nos apontam é um
		    que fica resolvido para todos.`
	},
	{
		p: 'Isto tem custos, ou publicidade?',
		r: `Não tem nem vai ter. Não há publicidade, não há subscrição, não há compras, e
		    não há ninguém a pagar para aparecer aqui.`
	},
	{
		p: 'O que é que a app sabe sobre mim?',
		r: `Praticamente nada, e por desenho. Não há conta, não há login, não há cookies e
		    não há código de terceiros. As equipas que segues ficam no teu aparelho e não
		    saem dele.
		    <br><br>Tudo o que fica guardado está no teu telemóvel, e está enumerado um a um
		    na <a href="/privacidade">política de privacidade</a>.`
	}
];
