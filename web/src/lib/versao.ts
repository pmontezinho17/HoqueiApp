/**
 * A versão da aplicação, e o que mudou em cada uma.
 *
 * ## Porque é que isto existe, e não é só arrumação
 *
 * **O build não era determinista.** O SvelteKit injecta uma `version` no pacote do cliente e,
 * por omissão, essa versão é **o relógio** — `Date.now()`. Resultado medido a 10/10/2026: duas
 * construções do mesmo código, sem uma linha de diferença, produziam **17 revisões diferentes**
 * no manifesto do service worker. E uma revisão diferente é exactamente o que faz aparecer o
 * aviso de "há uma actualização".
 *
 * Ou seja: **cada publicação avisava todos os utilizadores, qualquer que fosse a alteração** —
 * mesmo uma que só mexesse na consola de manutenção, que nem vai no pacote do cliente. O dono
 * disse que até ele estava saturado de ver aquele aviso, e tinha razão a dobrar.
 *
 * Com esta constante a alimentar o `version.name` em `vite.config.ts`, duas construções do
 * mesmo código são **byte a byte iguais** — verificado — e o aviso só aparece quando a versão
 * sobe. Quem publica decide quando é que isso vale uma interrupção na vida de alguém.
 *
 * ## Quando subir cada número
 *
 * * **maior** (`2.0`) — o que muda a forma de usar a app: um ecrã novo, uma navegação
 *   diferente, uma coisa que estava num sítio e passou para outro;
 * * **menor** (`1.3`) — correcções e melhorias dentro do que já existia.
 * * **terceiro número** (`1.9.1`) — uma reparação que vai ao `main` a meio da semana, quando a
 *   próxima entrega já tem número. Nasceu a 31/10/2026: a `1.10` estava reservada para a entrega
 *   de segunda, e o dono quis que quem está em produção fosse avisado da reparação sem lhe gastar
 *   esse número. Produção passa da `1.9` para a `1.9.1`, e depois para a `1.10`.
 *
 * **Uma publicação que não mexe no que o utilizador vê não sobe a versão.** É o caso de uma
 * alteração à consola, ao raspador ou a um workflow — e é por isso que o aviso deixa de
 * aparecer nessas.
 *
 * ## Porque é que a primeira versão que as pessoas vêem é a 1.1 e não a 1.0
 *
 * A correcção do aviso foi a produção a 11/10/2026, um dia antes do resto, porque era um
 * domingo com 39 jogos e cada publicação avisava todos. Essa publicação levou a `1.0` — e a
 * caixa de novidades **não aparece a quem não tinha versão guardada**, por desenho: quem abre
 * a app pela primeira vez não tem nada de "novo" para ver.
 *
 * Resultado: nesse domingo todos os aparelhos gravaram `1.0` em silêncio. Se a entrega de
 * segunda saísse também como `1.0`, a caixa não apareceria a ninguém e os seis pontos que o
 * dono reviu nunca seriam lidos. Daí 1.1.
 */
export const VERSAO = '1.10';

/**
 * **O número que se vê sobe uma vez por entrega; o site de testes ganha uma marca por cima.**
 *
 * Até 26/10/2026 a regra era subir o `VERSAO` a cada fusão no `dev` que se notasse — escrita a
 * 21/10, depois de cinco alterações ficarem debaixo da mesma `1.7` e a app do dono nunca ser
 * avisada. Resolvia o site de testes e estragava produção: quem lá está viu a `1.6` passar
 * para a `1.8`, porque a `1.7` só existiu no `dev`, e o dono deu por isso no telemóvel a
 * 26/10. E a `1.10` do pedido seguinte ia abrir outro buraco.
 *
 * As duas coisas pediam números diferentes, e agora têm-nos:
 *
 * * o **`VERSAO`** é o da **próxima entrega em produção**. Sobe na primeira alteração visível
 *   depois de uma entrega, e as seguintes juntam-se à mesma entrada de `NOVIDADES`. Produção
 *   passa sempre de uma para a seguinte;
 * * no **site de testes** o `ramo.yml` passa o commit em `REVISAO_DE_TESTES`, e a versão da
 *   construção fica `1.9+40a5273`. Cada fusão no `dev` muda a marca, e o aviso aparece — sem
 *   ninguém se lembrar de subir nada.
 *
 * Produção não recebe a variável, por isso a construção de lá é o `VERSAO` sozinho e
 * continua igual byte a byte entre duas construções do mesmo código.
 */
export function versaoDaConstrucao(versao: string, revisao?: string | null): string {
	const marca = revisao?.trim().slice(0, 7);
	return marca ? `${versao}+${marca}` : versao;
}

/**
 * Em que grupo é que uma novidade cai.
 *
 * ## A avaliação que levou a estes três, e não a outros
 *
 * O dono pediu, a 12/10/2026, para *"organizar as novidades por contextos, por exemplo,
 * funcionalidade nova ou corrigida, layout, regras"*, e pediu uma avaliação do que faz sentido
 * para quem lê. São três, e o `layout` não é um deles.
 *
 * **Um grupo só se justifica se mudar a forma de ler o que vem a seguir.** Estes mudam:
 *
 * * `regras` — *"um número que vês mudou, e não foi avaria nossa"*. É o único grupo que
 *   defende a credibilidade da app: uma equipa que desce um lugar na tabela faz alguém pensar
 *   que nós nos enganámos, e é aqui que ele descobre que não. Nenhum outro grupo faz isto.
 * * `novo` — *"passas a poder fazer/ver uma coisa que não havia"*.
 * * `corrigido` — *"uma coisa que te irritava deixou de acontecer"*. Pede-se desculpa de
 *   passagem, e quem não tropeçou no defeito pode saltar o grupo inteiro.
 *
 * **Porque é que o `layout` ficou de fora.** "Layout" é uma categoria sobre *nós* — descreve o
 * que mexemos, não o que mudou para quem usa. Uma alteração de desenho que se nota é sempre
 * uma das outras três: ou passou a dar-se para fazer algo (`novo`), ou deixou de atrapalhar
 * (`corrigido`). E uma que não se nota não entra nesta lista — é a regra deste ficheiro.
 *
 * **Porque é que não são por zona da app** (Jogos, Competições, Ficha). Era a outra hipótese
 * séria, e deixaria alguém que segue só SUB-17 saltar o bloco dos Escolares. Perde-se por
 * aritmética: dez pontos espalhar-se-iam por cinco ou seis zonas, com grupos de um ponto cada
 * — mais cabeçalhos do que conteúdo. A zona vai no **título** de cada ponto, que é onde ela
 * se lê de relance sem custar uma linha.
 *
 * A ordem é a de quem lê, e está no `GRUPOS`.
 */
export type Tipo = 'regras' | 'novo' | 'corrigido';

/**
 * Os grupos, **pela ordem em que aparecem**, e os rótulos tal como se leem na caixa.
 *
 * `regras` vem primeiro de propósito: é o que explica um número diferente, e é a dúvida que
 * leva alguém a achar que a app está errada. As correcções vêm no fim porque são o que menos
 * exige de quem lê — não há nada a fazer com elas.
 */
export const GRUPOS: { tipo: Tipo; rotulo: string }[] = [
	{ tipo: 'regras', rotulo: 'Regras da associação' },
	{ tipo: 'novo', rotulo: 'Novo' },
	{ tipo: 'corrigido', rotulo: 'Corrigido' }
];

/**
 * Um ponto da lista: **o que entrou, em negrito, e só depois o porquê**.
 *
 * Pedido pelo dono a 12/10/2026: *"cada bullet de novidade deverá logo informar a bold o que
 * está a entrar/corrigir na aplicação, e só depois é que uma pequena descrição"*. Antes era
 * uma frase corrida por ponto, e numa lista de dez isso é um parágrafo de dez linhas que
 * ninguém percorre — o olho precisa de uma âncora por linha para poder saltar.
 */
export type Ponto = {
	tipo: Tipo;
	/**
	 * O chavão, curto. Diz **o quê** e, quando ajuda, **onde** — "Na ficha de jogo", "Nas
	 * Competições". Há um teste que o mantém curto: um título que dá três linhas deixa de ser
	 * um título e volta a ser a frase que isto veio substituir.
	 */
	titulo: string;
	/** o porquê, numa ou duas frases, para quem o título interessou */
	texto: string;
};

export type Novidade = {
	/** a versão em que isto entrou */
	versao: string;
	/** `AAAA-MM-DD`, para a caixa poder dizer "de quando" */
	data: string;
	/** o que mudou, do ponto de vista de quem usa — não do de quem programou */
	pontos: Ponto[];
};

/**
 * O que mudou, da mais recente para a mais antiga.
 *
 * **Escrito para quem usa a app.** "Passámos o armazenamento das medições de KV para D1" não
 * diz nada a um pai à procura do jogo do filho; "a app já não deixa de actualizar a meio de um
 * sábado" diria — se fosse verdade para ele, que não é, porque isso nunca lhe tocou. A regra é
 * simples: se não se nota a usar, não entra aqui.
 */
export const NOVIDADES: Novidade[] = [
	{
		versao: '1.10',
		data: '2026-11-02',
		pontos: [
			{
				tipo: 'novo',
				titulo: '🧮 Benjamins e Escolares: o Mérito de cada jogo, conta a conta',
				texto:
					'Ganhar 21–5 e ficar 1–11 no Mérito? Acontece! Na ficha do jogo há um separador novo que mostra, regra a regra, os pontos que cada equipa ganhou e perdeu. E nas listas, por baixo de cada jogo, uma linha com duas barrinhas e o resultado do Mérito.'
			},
			{
				tipo: 'novo',
				titulo: '🟩🟥 O que dizem as barras do Mérito',
				texto:
					'Nos jogos de Benjamins e Escolares, por baixo do resultado, há uma barra por equipa: a da esquerda é a da casa, a da direita a de fora. O verde é a parte dos pontos que a equipa ganhou (bonificações) e o vermelho a parte que perdeu (penalizações); juntos enchem sempre a barra. Quem ganhou 9 pontos e perdeu 10 tem a barra quase meio a meio. O número ao lado é o Mérito da equipa nesse jogo, e fica a vermelho quando é negativo.'
			},
			{
				tipo: 'novo',
				titulo: '🟨 Benjamins e Escolares: pontos a amarelo no Mérito',
				texto:
					'Quando um atleta entra a meio de uma meia parte (um J na ficha), o regulamento conta essa meia parte como jogada e a equipa é penalizada. Esses pontos aparecem a amarelo, com uma nota a explicar. Se o clube regularizar junto da APL, a app actualiza sozinha.'
			},
			{
				tipo: 'novo',
				titulo: '🔤 Escolhe a série que queres ver',
				texto:
					'Nas competições com várias séries já não tens de percorrer as seis: escolhes a que te interessa numa lista, ao lado da escolha entre tabela simples e completa. A série da tua equipa leva uma estrela ★. Foi uma sugestão vossa — obrigado! E os separadores da competição, da equipa e do jogo passaram a ser iguais, de ponta a ponta do ecrã, com o nome por baixo de cada ícone. O ícone dos Jogos é agora um rinque, e o topo da competição e da equipa fica parado enquanto rolas.'
			},
			{
				tipo: 'novo',
				titulo: '📅 O calendário da equipa tem separador próprio',
				texto:
					'O mês inteiro da tua equipa, com os resultados e os próximos jogos, deixou de estar escondido dentro dos Jogos: tem agora o seu separador, entre os Jogos e a Classificação. E é lá que podes pôr os jogos no calendário do telemóvel.'
			},
			{
				tipo: 'novo',
				titulo: '👉 Desliza para mudar de separador',
				texto:
					'Na competição e na equipa já podes passar de um separador para o outro a deslizar o dedo, como na ficha de jogo. Em qualquer sítio do ecrã, e não só por cima dos jogos — também por cima das tabelas, que já não rolam para o lado quando cabem no ecrã.'
			},
			{
				tipo: 'corrigido',
				titulo: '↩️ Voltar já te deixa onde estavas',
				texto:
					'Abrias um jogo a partir dos Jogos de uma equipa, carregavas na seta e aparecias no Resumo. Agora voltas ao separador e à série onde estavas. E a barra de baixo já não se apaga num jogo ou numa equipa: fica acesa a secção de onde vieste.'
			},
			{
				tipo: 'corrigido',
				titulo: '🗓️ A jornada da semana que vem já não está "em curso"',
				texto:
					'Acabava a jornada ao sábado e, no calendário da competição, a seguinte passava logo a dizer "em curso", uma semana antes do primeiro jogo. Agora diz "próxima" até ao dia do primeiro jogo.'
			},
			{
				tipo: 'corrigido',
				titulo: '🌍 Fora de Portugal continental, os jogos à hora certa',
				texto:
					'As horas dos jogos são as de Lisboa, mas a app lia-as na hora do teu telemóvel. Nos Açores, ou em viagem, os jogos a decorrer podiam não aparecer — ou ficar "ao vivo" horas depois do fim — e o botão do Google Calendar marcava o jogo à hora errada. Agora contam sempre a partir da hora de Lisboa.'
			},
			{
				tipo: 'novo',
				titulo: '🕐 Fora de Portugal, a hora dos jogos na tua hora',
				texto:
					'Se o teu telemóvel estiver noutro fuso horário — nos Açores, ou em viagem —, cada jogo mostra a tua hora em destaque e, por baixo, mais pequena, a hora em Portugal continental, com «PT» à frente. Só aparece quando as duas horas são diferentes: em Portugal continental e na Madeira fica tudo como estava.'
			}
		]
	},
	{
		versao: '1.9.1',
		data: '2026-10-31',
		pontos: [
			{
				tipo: 'corrigido',
				titulo: '🛡️ Na ficha de jogo, os emblemas voltam antes do apito',
				texto:
					'Num jogo por começar podias ver dois círculos vazios no lugar das equipas, e ' +
					'tocar num deles dava "página não encontrada". Acontecia quando a ficha oficial ' +
					'ainda não tinha as equipas lá dentro. Agora os nomes e os emblemas aparecem ' +
					'sempre, e tocar abre a equipa. 🙌'
			},
			{
				tipo: 'corrigido',
				titulo: '🔴 Um jogo acabado já não fica "ao vivo"',
				texto:
					'Quando a ficha oficial diz que um jogo terminou com uma nota a seguir — como ' +
					'"suspendido" —, a app continuava a mostrá-lo ao vivo, horas depois do fim. ' +
					'Agora passa a terminado, com o resultado final.'
			}
		]
	},
	{
		versao: '1.9',
		data: '2026-10-26',
		pontos: [
			{
				tipo: 'novo',
				titulo: '🛼 A caixa de opinião ganhou voz!',
				texto:
					'Antes de mais, obrigado 🙏 — por cada sugestão, cada elogio e cada aviso de ' +
					'que alguma coisa estava mal. Foram vocês que fizeram a app crescer. Mas até ' +
					'aqui eu lia tudo e não podia responder a nada 🤐. Agora escolhes: **Sugestão**, ' +
					'se é para melhorar a app, ou **Pergunta**, se queres resposta — essa vai por ' +
					'email e eu respondo-te. 💌'
			},
			{
				tipo: 'novo',
				titulo: '🔒 A privacidade ganhou uma linha',
				texto:
					'Passei a contar que tipo de aparelho abre a app — iPhone, Android ou ' +
					'computador — e só isso: uma contagem por dia. Nada de IP, nada que diga quem ' +
					'és. Um iPad conta como computador, porque se apresenta como um Mac 🤷.'
			},
			{
				tipo: 'corrigido',
				titulo: '⏱️ Benjamins e Escolares: as quatro partes, uma a uma',
				texto:
					'Nos jogos de **quatro partes**, as Informações do jogo juntavam-nas duas a ' +
					'duas, porque é assim que vêm no boletim oficial. Agora vês o resultado e as ' +
					'faltas de cada parte. Obrigado ao treinador que deu por isso 🙌'
			},
			{
				tipo: 'corrigido',
				titulo: '🙈 O balão já não tapa resultados',
				texto:
					'Quando rolas a lista, o balão de opinião encosta-se à margem e fica só uma ' +
					'pontinha verde à vista — toca nela e abre na mesma. Lá em cima volta inteiro. ' +
					'A ideia foi de quem me escreveu, obrigado! 💚'
			}
		]
	},
	{
		versao: '1.8',
		data: '2026-10-21',
		pontos: [
			{
				tipo: 'corrigido',
				titulo: 'O calendário da equipa deixa de trocar casa com fora',
				texto:
					'Num dia com dois jogos — um em casa e outro fora — o calendário pintava o dia ' +
					'inteiro conforme o primeiro, e o segundo aparecia trocado. Agora o dia só se ' +
					'pinta quando os jogos concordam, e num dia misto é cada jogo que leva o seu ' +
					'"F". Obrigado a quem nos avisou pela caixa "O que está mal": estavam 67 dias ' +
					'desta época a dizer mal.'
			},
			{
				tipo: 'novo',
				titulo: 'Todos os jogos da lista se abrem, e o emblema leva-te à equipa',
				texto:
					'Um jogo que ainda não se disputou já se pode abrir: mostra a hora, o ' +
					'recinto e a prova, e avisa que o onze aparece quando o jogo começar. Antes ' +
					'não dava para carregar em nada. E lá dentro, no topo, o emblema de cada ' +
					'equipa passa a abrir a página dela — era o pedido mais repetido na caixa ' +
					'"O que está mal". Na lista, tocar em qualquer ponto da linha abre sempre o ' +
					'jogo, para o dedo nunca fazer a coisa errada.'
			},
			{
				tipo: 'corrigido',
				titulo: 'Voltar de um jogo mantém o dia onde estavas',
				texto:
					'Escolhias o dia 31 na fita, abrias um jogo, carregavas na seta para trás — e ' +
					'caías no dia de hoje. O endereço estava certo e era a app que o reescrevia a ' +
					'seguir. Agora volta ao dia de onde vieste.'
			},
			{
				tipo: 'novo',
				titulo: 'Os filtros ficam à vista enquanto rolas',
				texto:
					'A linha do escalão e do agrupar cola-se por baixo do calendário, como ele já ' +
					'faz com o cabeçalho. Num sábado de 40 jogos deixa de ser preciso subir tudo ' +
					'para mudar de escalão.'
			},
			{
				tipo: 'novo',
				titulo: 'Agrupa os jogos do dia por hora ou por pavilhão',
				texto:
					'No topo há agora duas listas: à esquerda escolhes o escalão, à direita como ' +
					'queres ver o dia. Por hora mostra tudo numa lista só, a subir com o relógio; ' +
					'por local junta o que se joga em cada pavilhão, por ordem alfabética, e cada ' +
					'pavilhão abre e fecha. Por escalão continua a ser como era. Foi uma sugestão ' +
					'deixada na caixa "O que está mal".'
			},
			{
				tipo: 'novo',
				titulo: 'O placar diz em que parte vai o jogo',
				texto:
					'Num jogo a decorrer, por baixo do resultado passa a dizer a parte e o minuto ' +
					'— "2ª Parte · 12:34". Antes mostrava só o minuto, e não se sabia se era a ' +
					'primeira ou a segunda. E as faltas de equipa, que só apareciam ao vivo, ' +
					'ficam agora visíveis também nos jogos já terminados.'
			},
			{
				tipo: 'corrigido',
				titulo: 'Nos Escolares e Benjamins, a ficha de jogo mostra o Mérito',
				texto:
					'Nesses escalões a classificação é o Mérito do Artigo 92.º, e a ficha de jogo ' +
					'não o mostrava — não tinha sequer separador de classificação. Agora tem, com ' +
					'as duas equipas do jogo realçadas na tabela.'
			},
			{
				tipo: 'corrigido',
				titulo: 'A seta de voltar volta para onde estavas',
				texto:
					'Quem abria um jogo a partir da página de uma equipa, e carregava na seta ' +
					'para trás, ia parar à lista de jogos em vez de voltar à equipa. Agora volta ' +
					'ao ecrã de onde vieste, com o separador e a posição como os deixaste. Se ' +
					'abriste o jogo por um link partilhado, a seta leva-te ao dia desse jogo — ' +
					'que é o melhor que há quando não houve ecrã nenhum antes.'
			}
		]
	},
	{
		versao: '1.6',
		data: '2026-10-17',
		pontos: [
			{
				tipo: 'novo',
				titulo: 'O "O que há de novo" passa a ter tudo o que já mudou',
				texto:
					'No menu ☰, em vez de te mostrar só a última entrega, mostra todas — por ' +
					'versão e só os títulos, para caber num ecrã. Tocas num título e abre-se a ' +
					'explicação. A nota que aparece sozinha depois de actualizares continua a ' +
					'mostrar só o que é novo para ti, com o texto todo.'
			}
		]
	},
	{
		versao: '1.5',
		data: '2026-10-17',
		pontos: [
			{
				tipo: 'corrigido',
				titulo: 'Entre a meia-noite e a uma, a app já sabe que dia é',
				texto:
					'Se abrisses a app nessa hora, ela mostrava o dia anterior — era a hora de ' +
					'verão a enganá-la. Agora abre sempre no dia certo em Portugal.'
			}
		]
	},
	{
		versao: '1.4',
		data: '2026-10-17',
		pontos: [
			{
				tipo: 'novo',
				titulo: 'As faltas de equipa, debaixo do resultado, durante o jogo',
				texto:
					'Num jogo a decorrer passas a ver quantas faltas cada equipa leva, uma de cada ' +
					'lado. À 9.ª o número fica amarelo — a próxima é livre directo — e à ' +
					'10.ª fica vermelho. Depois repete-se de cinco em cinco, como manda a regra: ' +
					'15.ª, 20.ª, e assim por diante. Num jogo terminado continuam onde sempre ' +
					'estiveram, na caixa de informação.'
			}
		]
	},
	{
		versao: '1.3',
		data: '2026-10-14',
		pontos: [
			{
				tipo: 'corrigido',
				titulo: 'Nos Escolares e Benjamins, a classificação da equipa voltou',
				texto:
					'Quem abrisse uma equipa destes escalões e fosse a "Classificação" lia que não ' +
					'havia nenhuma publicada. Havia: é o Mérito da Formação, e aparecia na página ' +
					'da competição mas não na da equipa. Já aparece nas duas, com a tua equipa ' +
					'destacada.'
			}
		]
	},
	{
		versao: '1.2',
		data: '2026-10-14',
		pontos: [
			{
				tipo: 'novo',
				titulo: 'O "O que está mal" passa a enviar com um toque',
				texto:
					'Antes abria o teu programa de email e tinhas de carregar em enviar lá. Agora ' +
					'vai directamente, e a caixa diz-te claramente que chegou. Guardamos o que ' +
					'escreveres, com o ecrã e a versão, para o podermos corrigir — e não guardamos ' +
					'quem és. Está tudo explicado na política de privacidade, incluindo como pedir ' +
					'que desapareça.'
			},
			{
				tipo: 'corrigido',
				titulo: 'A app deixa de avisar de actualizações que não se vêem',
				texto:
					'Só te interrompe quando houver mesmo algo de novo para ti. Quando a alteração ' +
					'não muda nada no que vês, actualiza-se em silêncio.'
			}
		]
	},
	{
		versao: '1.1',
		data: '2026-10-12',
		pontos: [
			{
				tipo: 'regras',
				titulo: 'Escolares e Benjamins: a classificação é o Mérito da Formação',
				texto:
					'É o que o regulamento da associação manda nestes escalões, e conta levar a ' +
					'equipa completa e pôr toda a gente a jogar — não quem ganha. As regras estão ' +
					'na própria tabela.'
			},
			{
				tipo: 'regras',
				titulo: 'Os empates desfazem-se pelo confronto directo',
				texto:
					'É o critério do regulamento, e vem antes da diferença de golos. Algumas ' +
					'tabelas mudam de ordem por causa disto.'
			},
			{
				tipo: 'regras',
				titulo: 'Nos Escolares e Benjamins, os cartões ao banco descontam',
				texto:
					'Um cartão a um treinador ou a um delegado tira pontos ao Mérito da equipa, ' +
					'como o regulamento prevê.'
			},
			{
				tipo: 'novo',
				titulo: 'Na ficha de jogo, os cartões da equipa técnica',
				texto:
					'Apareciam só os dos jogadores. Agora vês também os do treinador e do ' +
					'delegado, em todos os escalões.'
			},
			{
				tipo: 'novo',
				titulo: 'As Competições abrem numa grelha de escalões',
				texto: 'E mostram, por omissão, só as provas que estão a decorrer.'
			},
			{
				tipo: 'novo',
				titulo: 'Um menu com mais coisas dentro',
				texto:
					'No botão de três traços, em cima à direita: perguntas frequentes, o que há ' +
					'de novo, e o tema claro ou escuro à tua escolha em vez de seguir sempre o ' +
					'telemóvel.'
			},
			{
				tipo: 'novo',
				titulo: 'No iPhone, um aviso para guardar a app no ecrã principal',
				texto:
					'É a única forma de o Safari não apagar as tuas equipas depois de uma semana ' +
					'sem abrires a aplicação. Há uma pergunta nova sobre isso nas Perguntas ' +
					'frequentes.'
			},
			{
				tipo: 'corrigido',
				titulo: 'Um jogo que ainda não começou já abre',
				texto:
					'Mostra as equipas, a hora, o recinto e a classificação, em vez de um erro.'
			},
			{
				tipo: 'corrigido',
				titulo: 'O guia da primeira visita não volta a aparecer',
				texto:
					'Se o fechasses a meio, ele contava como não visto e voltava na abertura ' +
					'seguinte. Agora conta assim que aparece, e quem o quiser rever tem o botão ' +
					'em Sobre a app.'
			},
			{
				tipo: 'corrigido',
				titulo: 'Esta caixa só aparece quando houver algo novo',
				texto:
					'Antes aparecia a cada publicação, mesmo nas que não mexiam em nada que tu ' +
					'vejas.'
			}
		]
	}
];
