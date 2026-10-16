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
export const VERSAO = '1.4';

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
		versao: '1.4',
		data: '2026-10-17',
		pontos: [
			{
				tipo: 'novo',
				titulo: 'As faltas de equipa, debaixo do resultado, durante o jogo',
				texto:
					'Num jogo a decorrer passas a ver quantas faltas cada equipa leva, de cada lado ' +
					'de um apito. À 9.ª o número fica amarelo — a próxima é livre directo — e à ' +
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
