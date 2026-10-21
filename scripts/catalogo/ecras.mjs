/**
 * Os ecrãs do catálogo de componentes, e o que cada um mostra.
 *
 * Esta lista é a parte que envelhece: um ecrã novo acrescenta-se aqui e o `capturar.mjs`
 * passa a fotografá-lo nos dois temas sem mais nada.
 *
 * `prepara` recebe a página do Playwright já carregada e deixa-a no estado a fotografar —
 * tocar num separador, abrir um menu. `chaves` escreve-se no `localStorage` antes de a app
 * arrancar, e é assim que se forçam os avisos que normalmente só aparecem uma vez.
 *
 * **Os IDs dos jogos são escolhas com motivo, e não exemplos ao acaso:**
 * - `9349` é o jogo com mais lances da época (61) — a cronologia cheia;
 * - `10000` é um 13–4, que é o caso em que a ficha de equipas fica comprida;
 * - `9500` ainda não se jogou, e é aí — e só aí — que aparece o separador da classificação.
 */

/** Um favorito válido, no formato que o `favoritos.svelte.ts` valida. */
export const FAVORITOS = [
	{ equipa: 'CD PAÇO ARCOS', categoria: 'SUB-19', competicoes: [457] },
	{ equipa: 'AE FISICA D A', categoria: 'ESCOLARES', competicoes: [460, 461] }
];

const MERITO = '/competicoes/escolares--encontros-distritais-escolares-1-fase-nivel-i';
const TABELA = '/competicoes/sub-19--camp-reg-sub-19-1-fase';
const EQUIPA = '/equipa/sub-19/cd-paco-arcos';

/** Toca num separador pelo nome acessível — na ficha de jogo são ícones sem texto. */
const separador = (nome) => async (pag) => {
	await pag.getByRole('tab', { name: nome, exact: true }).first().click();
	await pag.waitForTimeout(500);
};

export const ECRAS = [
	{
		id: '01-jogos-do-dia',
		titulo: 'Jogos do dia',
		url: '/',
		mostra: ['FitaDatas', 'LinhaJogo', 'Emblema', 'Faixa', 'Feedback (a bolha)'],
		nota: 'O ecrã de entrada, e o mais aberto de todos. A fita dos dias é o único sítio da app que se arrasta na horizontal.'
	},
	{
		id: '02-jogos-filtrados',
		titulo: 'Jogos do dia, filtrados por escalão',
		url: '/',
		mostra: ['pílulas de escalão (uma escolhida)', 'LinhaJogo'],
		nota: 'O mesmo ecrã com um escalão escolhido. As pílulas mudam de dia para dia — só aparecem os escalões que jogam.',
		prepara: async (pag) => {
			// o índice 0 é o "Todos"; o 1 é o primeiro escalão que haja nesse dia
			await pag.locator('[data-guia=escaloes] button').nth(1).click();
			await pag.waitForTimeout(400);
		}
	},
	{
		id: '03-jogo-cronologia',
		titulo: 'Jogo terminado — cronologia',
		url: '/jogo/9349',
		mostra: ['Holofote', 'Faixa', 'Cronologia', 'Bola'],
		nota: 'Lance a lance. O holofote é o cabeçalho do jogo e encolhe ao rolar — aqui está por encolher.',
		prepara: separador('Eventos do jogo')
	},
	{
		id: '04-jogo-equipas',
		titulo: 'Jogo terminado — equipas',
		url: '/jogo/10000',
		mostra: ['FichaEquipas', 'Holofote', 'Faixa'],
		nota: 'A convocatória e as estatísticas de cada atleta. Um 13–4 é o caso em que esta tabela fica mais comprida.',
		prepara: separador('Equipas')
	},
	{
		id: '05-jogo-informacoes',
		titulo: 'Jogo terminado — informações',
		url: '/jogo/10000',
		mostra: ['InfoJogo', 'Icone', 'BoletimOficial'],
		nota: 'Recinto, data, árbitros e o boletim oficial da APL. A linha de ícones de texto vive toda aqui.',
		prepara: separador('Informações')
	},
	{
		id: '06-jogo-por-comecar',
		titulo: 'Jogo por começar — classificação',
		url: '/jogo/9500',
		mostra: ['Holofote (sem resultado)', 'TabelaClassificacao dentro do jogo'],
		nota: 'Antes do apito não há cronologia nem ficha. O que a app mostra é a tabela das duas equipas.',
		prepara: separador('Classificação')
	},
	{
		id: '07-competicoes',
		titulo: 'Competições',
		url: '/competicoes',
		mostra: ['CrachaEscalao', 'lista de provas'],
		nota: 'As 37 provas da época, agrupadas por escalão.'
	},
	{
		id: '08-classificacao',
		titulo: 'Classificação de uma prova',
		url: TABELA,
		mostra: ['TabelaClassificacao', 'RotuloCalculada', 'Emblema'],
		nota: 'A tabela de pontos. Quando a APL não a publica, calculamo-la — e dizemo-lo com um rótulo.'
	},
	{
		id: '09-calendario-da-prova',
		titulo: 'Calendário de uma prova',
		url: TABELA,
		mostra: ['LinhaJogo agrupada por jornada'],
		nota: 'Os jogos todos da prova, por jornada, com a jornada em curso em foco ao abrir.',
		prepara: separador('Calendário')
	},
	{
		id: '10-marcadores',
		titulo: 'Marcadores de uma prova',
		url: TABELA,
		mostra: ['lista de marcadores', 'Emblema'],
		nota: 'Quem marca golos na prova.',
		prepara: separador('Marcadores')
	},
	{
		id: '11-merito',
		titulo: 'Mérito da Formação',
		url: MERITO,
		mostra: ['TabelaMerito', 'ChapeuMerito', 'LegendaMerito', 'RegrasMerito'],
		nota: 'Nos Escolares e Benjamins não há pontos — há Mérito. Outra tabela, outra leitura, e um chapéu e uma legenda próprios.'
	},
	{
		id: '12-o-meu-clube-vazio',
		titulo: 'O Meu Clube — ainda sem clube',
		url: '/clube',
		mostra: ['EscolherClubes', 'estado vazio'],
		nota: 'O que vê quem abre a app pela primeira vez. Um estado vazio é um ecrã como outro qualquer, e tem de convidar.',
		semFavoritos: true
	},
	{
		id: '13-o-meu-clube',
		titulo: 'O Meu Clube',
		url: '/clube',
		mostra: ['cartões de equipa seguida', 'Emblema', 'Folha'],
		nota: 'Com duas equipas seguidas. É o ecrã que mais gente abre a seguir ao dos jogos.'
	},
	{
		id: '14-equipa-resumo',
		titulo: 'Equipa — resumo',
		url: `${EQUIPA}?aba=resumo`,
		mostra: ['cabeçalho de equipa', 'FormaRecente', 'LinhaJogo', 'AdicionarCalendario'],
		nota: 'O último jogo, o próximo, e a forma recente — as cinco bolas de vitória, empate e derrota.'
	},
	{
		id: '15-equipa-jogos',
		titulo: 'Equipa — jogos em lista',
		url: `${EQUIPA}?aba=jogos&vista=lista`,
		mostra: ['LinhaJogo'],
		nota: 'Todos os jogos da equipa, em lista.'
	},
	{
		id: '16-equipa-calendario',
		titulo: 'Equipa — jogos em calendário',
		url: `${EQUIPA}?aba=jogos&vista=calendario`,
		mostra: ['CalendarioMes', 'Emblema'],
		nota: 'A mesma informação num mês. A grelha de calendário só existe aqui.'
	},
	{
		id: '17-equipa-classificacao',
		titulo: 'Equipa — classificação',
		url: `${EQUIPA}?aba=classificacao`,
		mostra: ['TabelaClassificacao com a linha da equipa destacada'],
		nota: 'A tabela da prova dela, com a linha própria em destaque.'
	},
	{
		id: '18-equipa-plantel',
		titulo: 'Equipa — plantel',
		url: `${EQUIPA}?aba=plantel`,
		mostra: ['lista de atletas'],
		nota: 'Quem joga, e quanto marcou na época.'
	},
	{
		id: '19-procurar',
		titulo: 'Procurar',
		url: '/procurar',
		mostra: ['campo de procura', 'Emblema'],
		nota: 'Procura por equipa e por prova, feita no próprio aparelho — não custa um pedido à rede.'
	},
	{
		id: '20-menu',
		titulo: 'Menu',
		url: '/',
		mostra: ['MenuMais', 'Icone', 'escolha de tema', 'escolha de cor'],
		nota: 'A gaveta do ☰. É aqui que se escolhe o tema e a cor de acento, e é o sítio com mais ícones por centímetro.',
		prepara: async (pag) => {
			await pag.getByRole('button', { name: 'Mais opções' }).click();
			await pag.waitForTimeout(600);
		}
	},
	{
		id: '21-opiniao',
		titulo: 'O que está mal',
		url: '/',
		mostra: ['Feedback (painel aberto)'],
		nota: 'A caixa de opinião. É o único sítio da app onde alguém escreve texto que nós guardamos.',
		prepara: async (pag) => {
			await pag.getByRole('button', { name: 'Dar uma opinião sobre a aplicação' }).click();
			await pag.waitForTimeout(600);
		}
	},
	{
		id: '22-guia',
		titulo: 'Guia — primeiro passo',
		url: '/',
		mostra: ['Holofote (o guia)', 'passo do guia'],
		nota: 'O passeio pelos ecrãs que se oferece a quem chega. Escurece a página e ilumina uma parte dela.',
		chaves: { 'hoquei:guia-visto:v2': null }
	},
	{
		id: '23-ajuda',
		titulo: 'Ajuda',
		url: '/ajuda',
		mostra: ['texto corrido', 'Icone'],
		nota: 'Como se usa a app, escrito para quem nunca a abriu.'
	},
	{
		id: '24-privacidade',
		titulo: 'Política de privacidade',
		url: '/privacidade',
		mostra: ['texto corrido'],
		nota: 'A página que afirma por escrito o que a app não faz — zero cookies, zero tipos de letra externos. Qualquer alteração de desenho que lhe toque obriga a reescrevê-la.'
	},
	{
		id: '25-erro',
		titulo: 'Página que não existe',
		url: '/isto-nao-existe',
		mostra: ['+error.svelte'],
		nota: 'O estado de erro. Tem botão de repetir, e não é um beco.'
	}
];
