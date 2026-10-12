/**
 * Os interruptores do projecto, num sítio só, cada um com data de fim.
 *
 * ## Porque é que isto existe
 *
 * Um **interruptor** é uma linha de código que liga e desliga uma funcionalidade. Serve para
 * uma coisa que ramos não fazem: deixar uma funcionalidade **ir a produção desligada**, e
 * ligá-la depois sem publicar outra vez. Foi o dono a inventar o padrão aqui, a 10/10/2026,
 * sobre a transmissão em directo: *"mesmo que isto avance para produção, não há qualquer
 * problema, pois não vamos ter links de jogo. até acho que já pode avançar, e já fica
 * preparado para estas situações"*.
 *
 * É também o que resolve o problema que ele teve a 12/10, quando as cinco alterações do dia
 * foram a produção em bloco e ele não pôde levar umas e guardar outras. Com interruptor, vai
 * tudo e aparece o que ele mandar aparecer.
 *
 * ## E porque é que é uma lista com datas, e não só os interruptores espalhados
 *
 * Porque o risco de um interruptor **não é ligá-lo, é esquecê-lo**. A literatura sobre isto é
 * unânime num ponto só: sem disciplina de ciclo de vida, os interruptores tornam-se a dívida
 * seguinte. E aqui os dois modos de falha já tinham acontecido antes desta lista existir:
 *
 * 1. o `RECOLHER_FEEDBACK` diz no próprio cabeçalho que é temporário, e **não tinha data** —
 *    saía quando alguém se lembrasse;
 * 2. a lista de transmissões tinha uma entrada de um jogo de 10/10 ainda lá a 12/10. Inofensiva,
 *    porque a trava da data a impede de aparecer, mas era um endereço da câmara de um amigo do
 *    dono num repositório público a não dar nada em troca. Apagada no mesmo commit que isto.
 *
 * **Isto não é documentação, é um teste.** O `bandeiras.test.ts` falha quando um interruptor
 * passa da data, e falha quando o `onde` ou o `nome` deixam de existir no código — que é o que
 * transforma uma lista escrita à mão em algo que não pode mentir em silêncio.
 *
 * ## O que não entra aqui
 *
 * Nem toda a condição no código é um interruptor. O convite do iPhone só aparece no Safari, e
 * o Mérito só se aplica a duas provas: isso é **alcance**, é a regra da funcionalidade e é para
 * ficar. Um interruptor é uma coisa que está desligada hoje e que alguém quer ligada ou
 * apagada amanhã.
 */

export type Bandeira = {
	/** o identificador tal como aparece no código, para o teste o poder procurar */
	nome: string;
	/** o ficheiro onde o interruptor vive, a partir da raiz do repositório */
	onde: string;
	/** o que fica escondido enquanto estiver desligado, em linguagem de quem usa a app */
	esconde: string;
	/** quem pediu, quando, e porquê */
	porque: string;
	/**
	 * `AAAA-MM-DD` até quando isto tem de estar resolvido — ligado de vez ou apagado.
	 *
	 * `null` é para os que **são para ficar**, e exige uma razão no `porque`. Pôr data num
	 * interruptor permanente faria o teste avisar para sempre por algo que está certo, e um
	 * aviso que ninguém pode resolver ensina-se a ignorar.
	 */
	ate: string | null;
	/** o que há a apagar no dia em que sair */
	aoSair: string;
};

export const BANDEIRAS: Bandeira[] = [
	{
		nome: 'RECOLHER_FEEDBACK',
		onde: 'web/src/lib/feedback.ts',
		esconde: 'a bolha de opinião no canto e a linha "Dar uma opinião" no menu',
		porque:
			'existe para a fase de testes com pais e treinadores — o item 1 do backlog, pôr a ' +
			'app na mão de 5 a 10 pessoas — e sai quando ela acabar. A data é um palpite meu e ' +
			'é para ser corrigida: o que importa é que exista uma, não que esteja certa.',
		ate: '2026-11-30',
		aoSair: '`lib/feedback.ts`, `lib/Feedback.svelte` e a linha no `routes/+layout.svelte`'
	},
	{
		nome: 'DIRECTOS',
		onde: 'web/src/lib/directos.ts',
		esconde:
			'o ícone vermelho de transmissão na lista de jogos e o separador do vídeo na ficha',
		porque:
			'pedido do dono a 10/10/2026 e aprovado para produção no mesmo dia **com a lista ' +
			'vazia**. Não é um booleano: o interruptor é a lista estar vazia, e cada entrada só ' +
			'conta no dia do jogo. Vazia é o estado normal.',
		ate: null,
		aoSair: 'nada — a capacidade é para ficar; o que vai e vem são as entradas'
	},
	{
		nome: '--anonimizar-formacao',
		onde: 'scraper/src/hoquei/cli.py',
		esconde: 'os nomes dos atletas nos escalões abaixo de sub-17',
		porque:
			'desligado por decisão do dono a 30/09/2026, que publica os nomes em todos os ' +
			'escalões. Fica implementado e testado porque a política de privacidade promete ' +
			'remover um nome a pedido, e no dia em que alguém pedir é por aqui. O `AGENTS.md` ' +
			'diz expressamente para não o remover.',
		ate: null,
		aoSair: 'nada — é para ficar'
	}
];
