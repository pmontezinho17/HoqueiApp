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
 */
export const VERSAO = '1.0';

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
		versao: '1.0',
		data: '2026-10-10',
		pontos: [
			'Nos Escolares e nos Benjamins há uma tabela nova, o Mérito da Formação: pontua levar a equipa completa e pôr toda a gente a jogar, e não quem ganha.',
			'As classificações desempatam agora como o regulamento da associação manda — primeiro o confronto directo entre as equipas empatadas. Algumas tabelas mudam de ordem por causa disto.',
			'As Competições abrem numa grelha de escalões, e mostram por omissão só as provas a decorrer.',
			'Um jogo que ainda não começou já abre: mostra as equipas, a hora, o recinto e a classificação, em vez de um erro.',
			'Perguntas frequentes, no menu ⋮.',
			'Podes escolher o tema claro ou escuro no menu ⋮, em vez de seguir sempre o telemóvel.',
			'A partir daqui, esta caixa só aparece quando houver mesmo algo de novo para ti.'
		]
	}
];
