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
export const VERSAO = '1.1';

export type Novidade = {
	/** a versão em que isto entrou */
	versao: string;
	/** `AAAA-MM-DD`, para a caixa poder dizer "de quando" */
	data: string;
	/** o que mudou, do ponto de vista de quem usa — não do de quem programou */
	pontos: string[];
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
		versao: '1.1',
		data: '2026-10-12',
		pontos: [
			'Nos Escolares e nos Benjamins a classificação passa a ser o Mérito da Formação, como o regulamento da associação manda: conta levar a equipa completa e pôr toda a gente a jogar, e não quem ganha. As regras estão na própria tabela.',
			'As classificações desempatam agora como o regulamento manda — primeiro o confronto directo entre as equipas empatadas. Algumas tabelas mudam de ordem por causa disto.',
			'As Competições abrem numa grelha de escalões, e mostram por omissão só as provas a decorrer.',
			'Um jogo que ainda não começou já abre: mostra as equipas, a hora, o recinto e a classificação, em vez de um erro.',
			'No menu ⋮ há agora Perguntas frequentes, e podes escolher o tema claro ou escuro em vez de seguir sempre o telemóvel.',
			'Em iPhone, a app avisa uma vez que vale a pena guardá-la no ecrã principal: é a única forma de o Safari não apagar as tuas equipas depois de uma semana sem a abrires. Há uma pergunta nova sobre isso nas Perguntas frequentes.',
			'O guia da primeira visita deixa de reaparecer a quem o fechou a meio: passa a contar como visto assim que aparece. Quem o quiser rever tem o botão em Sobre a app.',
			'Na ficha de jogo os cartões ao treinador e ao delegado passam a aparecer, como já apareciam os dos jogadores — e nos Escolares e Benjamins também descontam no Mérito, como o regulamento manda.',
			'A partir daqui, esta caixa só aparece quando houver mesmo algo de novo para ti.'
		]
	}
];
