/**
 * O texto do catálogo: o que o designer precisa de saber antes de desenhar, e o que tem de
 * respeitar para o trabalho dele entrar na app sem passar por uma segunda mão.
 *
 * Está aqui e não dentro do `gerar_pagina.mjs` porque é a parte que se relê e se corrige —
 * e misturada com marcação ninguém a relê.
 */

export const PRODUTO = {
	nome: 'OK4Sticks',
	endereco: 'hoquei.pages.dev',
	emUmaLinha:
		'Uma aplicação web que acompanha o hóquei em patins da Associação de Patinagem de Lisboa: ' +
		'resultados, calendários, classificações e a ficha de cada jogo lance a lance.',
	quemUsa: [
		'Pais, treinadores, dirigentes e adeptos — gente dos clubes, não público geral.',
		'Quase sempre no telemóvel, muitas vezes numa bancada de pavilhão, com uma mão ocupada.',
		'Ao sábado de manhã há dezenas de jogos ao mesmo tempo: a pergunta é "como vai o meu?".',
		'Sete escalões, dos Benjamins aos Seniores, e 37 provas numa época.'
	],
	naoE: [
		'Não é oficial. Os dados são da associação, e a app diz isso em todas as páginas.',
		'Não tem conta, nem login, nem publicidade, nem loja.',
		'Não é uma app de telemóvel instalada de uma loja — abre no browser e pode ser guardada no ecrã principal.'
	]
};

export const FIXO = [
	{
		regra: 'Zero tipos de letra externos.',
		porque:
			'A política de privacidade afirma por escrito que a app não carrega nada de terceiros, ' +
			'e há um teste que falha se isso deixar de ser verdade. A letra é a do sistema — ' +
			'San Francisco no iPhone, Roboto no Android. Podes mudar pesos, tamanhos e espaçamento; ' +
			'não podes trazer uma família nova, nem sequer alojada por nós.'
	},
	{
		regra: 'Zero ficheiros de ícones em tipo de letra, e zero imagens para ícones.',
		porque:
			'Cada ícone é desenho SVG escrito dentro do código, numa grelha de 20×20 com traço de 1,8. ' +
			'É o que faz a app abrir sem pedir nada à rede e funcionar sem ligação.'
	},
	{
		regra: 'Tem de funcionar sem ligação, com o que já leu.',
		porque:
			'Num pavilhão a rede falha. Nada do desenho pode depender de uma imagem, de um tipo de ' +
			'letra ou de um script que venha de fora no momento em que o ecrã é desenhado.'
	},
	{
		regra: 'Dois temas, e o escuro não é o claro invertido.',
		porque:
			'Cada cor tem um valor no claro e outro no escuro, pensados à parte. Uma proposta de cor ' +
			'vem sempre aos pares. Um ecrã que só está desenhado no claro volta para trás.'
	},
	{
		regra: 'A medida é 375 × 812 — um iPhone pequeno.',
		porque:
			'É a largura em que o projecto verifica tudo. Desenhar a 390 ou a 414 e deixar que "depois ' +
			'encolhe" é como as linhas partem em dois e as tabelas ganham barra horizontal. ' +
			'Nenhum ecrã pode ter deslocamento lateral.'
	},
	{
		regra: 'A cor de acento é escolhida por quem usa a app.',
		porque:
			'Há seis paletas à escolha — verde (omissão), azul, marinho, vermelho, grená e roxo — e só ' +
			'mudam o acento: botões, separador escolhido, destaques. O fundo e o texto nunca mudam. ' +
			'Um desenho que precise de um acento em concreto para se ler está errado por desenho.'
	},
	{
		regra: 'Três cores querem dizer coisas e não se usam para enfeitar.',
		porque:
			'Laranja (--vivo) é "está a acontecer agora"; vermelho de gravação (--directo) é "este jogo ' +
			'dá para ver"; vermelho frio (--terminado) é "já acabou". Nunca aparecem a dizer outra coisa.'
	},
	{
		regra: 'A forma dos dados é pública e não se renomeia.',
		porque:
			'Isto é de engenharia e só importa aqui para uma coisa: podes propor que um ecrã mostre ' +
			'menos, ou por outra ordem — não podes contar com campos que não existem. O que está nos ' +
			'ecrãs é o que a associação publica.'
	}
];

export const LIVRE = [
	'A hierarquia de cada ecrã: o que salta primeiro à vista, o que recua.',
	'Espaçamento, densidade, alinhamento, agrupamento — a escala existe, os degraus podem mudar.',
	'Os 26 ícones, um a um ou todos: são o trabalho mais fácil de integrar que há aqui.',
	'Os onze crachás de escalão (já são SVG nossos; podem ser redesenhados).',
	'O ícone da aplicação — o que lá está foi desenhado por um script em Python e é provisório desde o primeiro dia.',
	'Os valores de cor, aos pares claro/escuro, desde que o contraste se mantenha.',
	'Pesos, tamanhos e espaçamento das letras, dentro da família do sistema.',
	'Os estados vazios, os erros e as mensagens — são ecrãs como os outros e estão aqui no catálogo.'
];

export const NAO_ENTREGUES = [
	['Um tipo de letra.', 'Não pode entrar, por mais bonito que seja.'],
	['Ícones em PNG ou em tipo de letra de ícones.', 'Só SVG de traço, na grelha de 20×20.'],
	['Ecrãs só no tema claro.', 'Os dois ou nenhum.'],
	['Ecrãs desenhados a 390 ou 414 sem dizer.', 'A medida é 375. Se usares outra, escreve-o.'],
	['Cores só numa imagem.', 'Os valores em texto, aos pares, senão alguém tem de os tirar a conta-gotas.'],
	['Um PDF com tudo lá dentro.', 'Ficheiros soltos entram; um PDF tem de ser desmontado à mão.']
];

export const DEVOLVER = [
	{
		o: 'Um componente redesenhado',
		como:
			'Um ficheiro por componente, com <strong>o identificador do catálogo no nome</strong> — ' +
			'<code>C09-linha-de-jogo.png</code> — e um ficheiro por estado quando o componente tem ' +
			'mais do que um. PNG a dupla densidade, ou um link do Figma com acesso de leitura. ' +
			'Ao lado, os números: tamanhos de letra, espaçamentos, e <strong>que token é cada ' +
			'cor</strong>. Uma imagem sem números obriga-me a adivinhar e a voltar a perguntar.',
		onde: 'o ficheiro que o catálogo nomeia em cada componente',
		depois:
			'Reescrevo o componente, corro as capturas outra vez e mando-te o mesmo catálogo com ' +
			'o teu desenho lá dentro, ao lado do antigo.'
	},
	{
		o: 'Ícones',
		como:
			'Um ficheiro <code>.svg</code> por ícone, com o nome exacto da lista deste catálogo. ' +
			'<code>viewBox="0 0 20 20"</code>, traço <code>1.8</code>, pontas e juntas redondas, ' +
			'<code>fill="none"</code> e <code>stroke="currentColor"</code> — a cor nunca vai escrita no ' +
			'desenho. Sem <code>&lt;style&gt;</code>, sem classes, sem <code>id</code>, sem gradientes, ' +
			'sem máscaras, sem texto convertido ou não.',
		onde: 'web/src/lib/Icone.svelte',
		depois: 'Colo cada desenho no ramo do ícone. É directo e não precisa de nada mais.'
	},
	{
		o: 'Crachás de escalão',
		como:
			'Um <code>.svg</code> quadrado por escalão, com o nome da lista (<code>sub-15.svg</code>). ' +
			'Têm de se ler a 18 px, que é o tamanho a que aparecem no placar do jogo.',
		onde: 'web/static/escaloes/',
		depois: 'Substituo os ficheiros. O código não muda.'
	},
	{
		o: 'Ícone da aplicação',
		como:
			'Um <code>.svg</code> quadrado, ou um PNG de 1024×1024. Deixa 20 % de margem à volta do ' +
			'desenho: no Android o sistema recorta-o em círculo, e o que ficar perto da borda perde-se.',
		onde: 'web/static/icones/ (três tamanhos, gerados)',
		depois:
			'Recorto os três tamanhos a partir do teu e substituo o <code>scripts/gerar_icones.py</code>, ' +
			'que é o que hoje desenha o provisório.'
	},
	{
		o: 'Cores',
		como:
			'Uma lista em texto: nome do token, valor no claro, valor no escuro. Para texto o contraste ' +
			'tem de ficar em 4,5:1 ou acima; para elementos gráficos, 3:1. Se um par não lá chegar, ' +
			'diz-me — às vezes compensa mudar o fundo em vez da cor.',
		onde: 'web/src/routes/+layout.svelte (o bloco :root) e web/src/lib/cor.svelte.ts',
		depois: 'Meço o contraste de cada par, aplico, e verifico nos dois temas a 375×812.'
	}
];

/** O que mudou nesta versão, e porquê. Vai no topo da página. */
export const PORQUE_MUDOU = {
	titulo: 'Terceira versão — e o que mudou desde a segunda',
	texto:
		'A primeira entrega (18/10) eram os ecrãs inteiros, e não servia: <em>"eu assim não ' +
		'desenho páginas, desenho apenas components"</em>. A segunda (19/10) passou a ser por ' +
		'componente, com nome e número. <strong>Esta é a mesma coisa posta em dia:</strong> entre ' +
		'19/10 e 12/11 entraram seis componentes novos e mudaram trinta e quatro, e o catálogo ' +
		'tinha ficado a descrever uma aplicação que já não existia. Os números que já existiam ' +
		'ficaram onde estavam; os novos entram a partir do <code>C44</code>. Três mudaram de ' +
		'significado porque o componente foi substituído — está dito em cada um.'
};

/** O que esta ronda corrigiu e acrescentou, para quem já viu a versão anterior. */
export const DIFERENCAS = [
	['C04', 'Era "Pílulas de escalão". As pílulas desapareceram a 21/10 e o filtro passou a um <strong>campo de selecção</strong>. O catálogo antigo mandava desenhar o que já não existe.'],
	['C05 e C06', 'Eram "Separadores de texto" e "Separadores de ícone", a mesma ideia em dois sítios. Agora há um componente só (C05); o C06 passa a ser a <strong>faixa que se arrasta</strong>.'],
	['C08', 'Era "Interruptor de duas vias", que já não existe — as duas vistas passaram a mais uma selecção. É agora a <strong>barra fixa de controlos</strong>.'],
	['C01', 'A barra de secções <strong>recolhe ao rolar</strong> desde 31/10.'],
	['C09', 'A linha de jogo ganhou as <strong>barras do Mérito</strong> nos escalões de formação, e a linha inteira passou a ser um só alvo.'],
	['C10', 'O bloco de jogos agrupa agora por <strong>escalão, hora ou local</strong>.'],
	['C18', 'A ficha de equipas ganhou as <strong>meias partes</strong> de cada atleta, os cartões por cor e a equipa técnica.'],
	['C21', 'O placar mostra a <strong>parte do jogo</strong> e as <strong>faltas</strong> de cada equipa.'],
	['C32', 'Os ícones passaram de 26 a <strong>29</strong>: entraram o <code>antes</code>, o <code>marcadores</code> e o <code>merito</code>.'],
	['C44 a C51', 'Oito componentes que faltavam: <strong>antes do jogo</strong>, <strong>mérito deste jogo</strong>, <strong>legenda da classificação</strong>, <strong>aviso de actualização</strong>, <strong>caixa de novidades</strong>, <strong>convite para instalar</strong>, <strong>transmissão</strong> e <strong>faixa do site de testes</strong>. Os cinco últimos só aparecem em situações raras e tinham-me escapado.']
];

/** O ritmo de entrega: uma peça de cada vez, vista na app antes da seguinte. */
export const RITMO = [
	'Começa pelos <strong>ícones</strong> (C32): 29 desenhos pequenos, entram sem discussão, e vês o resultado na app no mesmo dia.',
	'Depois o <strong>ícone da aplicação</strong>, que é uma peça só e está provisório desde o primeiro dia.',
	'Depois os componentes <strong>que aparecem em todos os ecrãs</strong> — C01 barra de secções, C02 cabeçalho, C09 linha de jogo. Mexer num destes muda a app inteira de uma vez.',
	'A seguir a <strong>linha comparada do C44</strong>: é um padrão só, repete-se em cinco secções, e é o componente mais recente e o que menos desenho tem.',
	'Só então os restantes, pela ordem que quiseres. Diz-me o identificador de cada um que começas, para eu não estar a mexer no mesmo.',
	'As <strong>cores</strong> ficam para o fim: mexem em tudo ao mesmo tempo e são as mais caras de verificar.'
];
