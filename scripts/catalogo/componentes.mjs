/**
 * O inventário dos componentes da aplicação: o nome de cada um, o que é, onde aparece, de
 * que partes é feito, e em que estados tem de ser desenhado.
 *
 * ## Porque é que esta lista existe, e porque é que ela é o catálogo
 *
 * A primeira entrega (18/10/2026) foram os 25 ecrãs fotografados inteiros, e o designer
 * respondeu que não servia: *"é mais uma overview das páginas (…) eu assim não desenho
 * páginas, desenho apenas components, que depois irão formar as páginas"*. Tinha razão, e a
 * segunda frase dele diz o que faltava: *"era bom o Claude dar os nomes a isto e separar
 * primeiro, para que depois seja fácil pedir-lhe para substituir"*.
 *
 * Então o que manda aqui é **o nome**. Cada componente tem um identificador (`C07`) que não
 * muda, um nome em português para se falar dele, e o ficheiro onde vive. É por esse
 * identificador que ele devolve o trabalho e por esse identificador que se integra.
 *
 * ## O que é um "estado" aqui
 *
 * Um componente desenha-se uma vez e vive em várias situações: a linha de um jogo que ainda
 * não começou não é a do jogo que acabou. Cada entrada em `estados` é uma dessas situações,
 * fotografada à parte. Um estado que não exista nos dados de hoje é **forçado** — e diz-se
 * que foi, no campo `forcado`, porque um catálogo que não distingue o que é real do que foi
 * encenado deixa de servir para medir fosse o que fosse.
 *
 * ## Os campos
 *
 * - `id`, `nome`, `ficheiro` — a identidade. O `ficheiro` é onde o desenho entra.
 * - `grupo` — a arrumação do catálogo, à maneira do Material 3.
 * - `oQueE` — uma frase. O que é, não como está feito.
 * - `onde` — em que ecrãs aparece. É o que diz ao designer o que ele parte se mexer aqui.
 * - `anatomia` — as partes com nome, como nos diagramas que ele mandou.
 * - `estados` — `{ nome, url, seletor, nota?, prepara?, agenda?, forcado? }`.
 *   O `seletor` é CSS e corre na página; o `prepara` é código do Playwright.
 *   O `agenda` reescreve a agenda publicada antes de a página a ler — é assim que se
 *   força um jogo a decorrer num dia em que não há nenhum.
 */

const MERITO = '/competicoes/escolares--encontros-distritais-escolares-1-fase-nivel-i';
const TABELA = '/competicoes/sub-19--camp-reg-sub-19-1-fase';
const EQUIPA = '/equipa/sub-19/cd-paco-arcos';
const JOGO_FEITO = '/jogo/9349';
const JOGO_GOLEADA = '/jogo/10000';
const JOGO_POR_COMECAR = '/jogo/9500';

/**
 * O dia que está **à frente**, no ecrã de Jogos.
 *
 * O `Faixa.svelte` monta três dias ao mesmo tempo — o de ontem e o de amanhã ficam fora do
 * ecrã, à espera de serem arrastados para dentro. Um selector solto apanha o vizinho, e o
 * `locator.screenshot()` vai buscá-lo onde ele está: a captura do bloco de escalão saiu com
 * o cabeçalho da aplicação lá dentro. Já tinha enganado um teste e o guia; agora enganou o
 * catálogo. Tudo o que se fotografa dentro da faixa passa por aqui.
 */
const DIA = 'main .pag:not(.esquerda):not(.direita)';

/** Toca num separador pelo nome acessível — na ficha de jogo são ícones sem texto. */
export const separador = (nome) => async (pag) => {
	await pag.getByRole('tab', { name: nome, exact: true }).first().click();
	await pag.waitForTimeout(400);
};

/**
 * Põe o primeiro jogo da agenda a decorrer, agora.
 *
 * O `emCurso()` do `formato.ts` exige três coisas ao mesmo tempo: `ao_vivo`, o dia de hoje,
 * e a hora de início já passada mas dentro da janela. Encenar menos do que isto dava uma
 * linha normal e uma captura a dizer o que não era.
 */
export const AGENDA = '**/v1/aplisboa/2026-27/agenda.json';
export const PROVAS = '**/v1/aplisboa/2026-27/comp/*.json';

/**
 * Passa a tabela oficial de uma prova a tabela calculada por nós.
 *
 * O `tabelasDe()` do `classificacao.ts` só considera a nossa quando a oficial vem vazia, e
 * é a nossa que acende o rótulo de "não oficial". Hoje, 19/10/2026, nenhuma das 23 provas
 * com tabela está nesse caso — todas têm a oficial —, e sem isto o rótulo não existiria em
 * captura nenhuma. É um estado real do produto, só não é o estado de hoje.
 */
export function tabelaCalculada(prova) {
	if (!prova.classificacao?.length) return prova;
	return { ...prova, classificacao: [], classificacao_calculada: prova.classificacao };
}

export function jogoADecorrer(agenda) {
	const agora = new Date();
	const hoje = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
	const ha20min = new Date(agora.getTime() - 20 * 60 * 1000);
	const jogos = agenda.jogos.map((j) => ({ ...j }));
	const alvo = jogos.find((j) => j.gc !== null) ?? jogos[0];
	Object.assign(alvo, {
		data: hoje,
		hora: `${String(ha20min.getHours()).padStart(2, '0')}:${String(ha20min.getMinutes()).padStart(2, '0')}:00`,
		ao_vivo: true,
		gc: 2,
		gf: 1,
		periodo: '1ª Parte',
		relogio: '07:12'
	});
	return { ...agenda, jogos };
}

export const COMPONENTES = [
	// ── Navegação ────────────────────────────────────────────────────────────────────────
	{
		id: 'C01',
		nome: 'Barra de secções',
		ficheiro: 'web/src/routes/+layout.svelte (.barra)',
		grupo: 'Navegação',
		oQueE: 'A barra fixa no fundo do ecrã, com as três secções da aplicação.',
		onde: 'Em todos os ecrãs, sempre visível.',
		anatomia: ['ícone', 'rótulo', 'contador de equipas seguidas', 'estado escolhido a cor de acento'],
		estados: [
			{ nome: 'Jogos escolhido', url: '/', seletor: 'nav.barra' },
			{ nome: 'O Meu Clube escolhido, com contador', url: '/clube', seletor: 'nav.barra' }
		]
	},
	{
		id: 'C02',
		nome: 'Cabeçalho da aplicação',
		ficheiro: 'web/src/routes/+layout.svelte (header)',
		grupo: 'Navegação',
		oQueE: 'A barra de cima: a marca, a idade dos dados, procurar e o menu.',
		onde: 'Em todos os ecrãs. Cola-se ao topo ao rolar.',
		anatomia: ['marca', 'idade dos dados', 'lupa', 'menu ☰'],
		estados: [{ nome: 'Normal', url: '/', seletor: 'header' }]
	},
	{
		id: 'C03',
		nome: 'Fita de dias',
		ficheiro: 'web/src/lib/FitaDatas.svelte',
		grupo: 'Navegação',
		oQueE: 'A fila de dias que se arrasta na horizontal para mudar o dia dos jogos.',
		onde: 'Ecrã de Jogos.',
		anatomia: ['dia da semana', 'dia e mês', 'estado escolhido', 'marca de hoje'],
		nota: 'É o único sítio da aplicação que se arrasta na horizontal. Estão três dias montados ao mesmo tempo.',
		estados: [{ nome: 'Com o dia de hoje escolhido', url: '/', seletor: '[data-guia=dias]' }]
	},
	{
		id: 'C04',
		nome: 'Pílulas de escalão',
		ficheiro: 'web/src/routes/+page.svelte (.escaloes)',
		grupo: 'Navegação',
		oQueE: 'O filtro por escalão, em pílulas. Só aparecem os escalões que jogam nesse dia.',
		onde: 'Ecrã de Jogos.',
		anatomia: ['pílula "Todos"', 'pílula por escalão', 'estado escolhido'],
		estados: [
			{ nome: 'Nenhum filtro', url: '/', seletor: '[data-guia=escaloes]' },
			{
				nome: 'Um escalão escolhido',
				url: '/',
				seletor: '[data-guia=escaloes]',
				prepara: async (pag) => {
					await pag.locator('[data-guia=escaloes] button').nth(1).click();
					await pag.waitForTimeout(300);
				}
			}
		]
	},
	{
		id: 'C05',
		nome: 'Separadores de texto',
		ficheiro: 'web/src/routes/competicoes/[grupo]/+page.svelte (.abas)',
		grupo: 'Navegação',
		oQueE: 'A fila de separadores com texto, sublinhada no escolhido.',
		onde: 'Ecrã de prova e ecrã de equipa.',
		anatomia: ['rótulo', 'sublinhado do escolhido'],
		estados: [
			{ nome: 'Numa prova', url: TABELA, seletor: '.abas' },
			{ nome: 'Numa equipa', url: `${EQUIPA}?aba=resumo`, seletor: '.abas' }
		]
	},
	{
		id: 'C06',
		nome: 'Separadores de ícone',
		ficheiro: 'web/src/lib/Faixa.svelte',
		grupo: 'Navegação',
		oQueE: 'Os separadores da ficha de jogo: só ícones, e o conteúdo arrasta-se de lado.',
		onde: 'Ficha de jogo.',
		anatomia: ['ícone', 'estado escolhido', 'páginas vizinhas montadas fora do ecrã'],
		nota: 'Cuidado: estão três páginas montadas ao mesmo tempo, e um selector apanha a vizinha que está fora do ecrã.',
		estados: [{ nome: 'Três separadores', url: JOGO_FEITO, seletor: '.tabs' }]
	},
	{
		id: 'C07',
		nome: 'Selector de prova',
		ficheiro: 'web/src/lib/SeletorCompeticao.svelte',
		grupo: 'Navegação',
		oQueE: 'O botão que mostra a prova actual e abre a lista das outras.',
		onde: 'Ecrã de prova.',
		anatomia: ['crachá de escalão', 'nome da prova', 'seta'],
		nota: 'Verificado a 19/10/2026: este componente **não está em uso em ecrã nenhum** — nenhuma página o importa. Fica no catálogo porque existe e porque, se voltar, é este o desenho. Não há captura.',
		estados: []
	},
	{
		id: 'C08',
		nome: 'Interruptor de duas vias',
		ficheiro: 'web/src/routes/competicoes/[grupo]/+page.svelte (.modos)',
		grupo: 'Navegação',
		oQueE: 'Duas pílulas grandes, uma escolhida, para alternar entre duas vistas.',
		onde: 'Ecrã de prova (todas as séries / uma série) e ecrã de equipa (lista / calendário).',
		anatomia: ['pílula esquerda', 'pílula direita', 'estado escolhido'],
		estados: [
			{ nome: 'Séries', url: TABELA, seletor: '.modos' },
			{ nome: 'Lista ou calendário', url: `${EQUIPA}?aba=jogos&vista=lista`, seletor: '.vistas' }
		]
	},

	// ── Listas e cartões ─────────────────────────────────────────────────────────────────
	{
		id: 'C09',
		nome: 'Linha de jogo',
		ficheiro: 'web/src/lib/LinhaJogo.svelte',
		grupo: 'Listas e cartões',
		oQueE: 'A linha de um jogo: hora, as duas equipas empilhadas, e o resultado.',
		onde: 'Jogos do dia, calendário da prova, jogos da equipa, O Meu Clube.',
		anatomia: ['hora ou estado', 'emblema', 'nome da equipa', 'resultado', 'vencedor a negrito'],
		nota: 'As equipas estão empilhadas e não lado a lado: medido, 15 de 34 nomes de um domingo apareciam cortados no desenho simétrico. É o componente mais visto da aplicação.',
		// Os três estados distinguem-se pelo que a linha tem lá dentro, e não pela posição:
		// `.golos` só existe num jogo jogado e `.vivo` só num a decorrer. Por posição, a
		// captura mudava de estado de cada vez que a jornada andasse.
		estados: [
			{
				nome: 'Jogo terminado',
				url: TABELA,
				seletor: 'main .linha:has(.golos)',
				prepara: separador('Calendário')
			},
			{ nome: 'Jogo por começar', url: TABELA, seletor: 'main .linha:not(:has(.golos))', prepara: separador('Calendário') },
			{
				nome: 'Jogo a decorrer',
				url: '/',
				seletor: `${DIA} .linha:has(.vivo)`,
						forjar: { padrao: AGENDA, transformar: jogoADecorrer },
				forcado: 'Não havia nenhum jogo a decorrer no momento da captura. A agenda foi reescrita antes de a página a ler.',
				nota: 'O ponto a pulsar e a fase do jogo substituem a hora. A fase é mais útil do que "AO VIVO": é ela que diz se vale a pena entrar.'
			}
		]
	},
	{
		id: 'C10',
		nome: 'Bloco de escalão',
		ficheiro: 'web/src/lib/PaginaDia.svelte (.bloco)',
		grupo: 'Listas e cartões',
		oQueE: 'O agrupador dos jogos de um escalão num dia: cabeçalho que se fecha, com contagem.',
		onde: 'Ecrã de Jogos.',
		anatomia: ['nome do escalão', 'contagem', 'seta de fechar', 'nome da prova', 'nome da série', 'linhas de jogo'],
		estados: [{ nome: 'Aberto', url: '/', seletor: `${DIA} .bloco` }]
	},
	{
		id: 'C11',
		nome: 'Cartão de equipa seguida',
		ficheiro: 'web/src/routes/clube/+page.svelte (.cartao)',
		grupo: 'Listas e cartões',
		oQueE: 'A linha de uma equipa que se segue, com o próximo jogo ou o último resultado.',
		onde: 'O Meu Clube.',
		anatomia: ['emblema', 'nome do clube', 'escalão', 'rótulo (PRÓXIMO / ÚLTIMO)', 'adversário', 'data', 'seta'],
		estados: [{ nome: 'Com próximo jogo', url: '/clube', seletor: '.cartao' }]
	},
	{
		id: 'C12',
		nome: 'Cartão de escalão',
		ficheiro: 'web/src/routes/competicoes/+page.svelte (.ficha)',
		grupo: 'Listas e cartões',
		oQueE: 'O cartão de um escalão no menu de competições, com o crachá grande.',
		onde: 'Ecrã de Competições.',
		anatomia: ['crachá de escalão', 'nome', 'número de provas'],
		estados: [{ nome: 'Normal', url: '/competicoes', seletor: 'ul.grelha li' }]
	},
	{
		id: 'C13',
		nome: 'Resultado de procura',
		ficheiro: 'web/src/routes/procurar/+page.svelte (.resultado)',
		grupo: 'Listas e cartões',
		oQueE: 'Uma linha de resultado da procura: equipa ou prova.',
		onde: 'Ecrã de Procurar.',
		anatomia: ['emblema', 'nome', 'escalão'],
		estados: [
			{
				nome: 'Com texto procurado',
				url: '/procurar',
				seletor: '.resultado',
				prepara: async (pag) => {
					await pag.locator('input').first().fill('paço');
					await pag.waitForTimeout(500);
				}
			}
		]
	},
	{
		id: 'C14',
		nome: 'Linha de marcador',
		ficheiro: 'web/src/routes/competicoes/[grupo]/+page.svelte (.marcadores li)',
		grupo: 'Listas e cartões',
		oQueE: 'Uma linha da lista de quem marca golos numa prova.',
		onde: 'Ecrã de prova, separador Marcadores.',
		anatomia: ['lugar', 'nome do atleta', 'emblema e clube', 'número de golos'],
		estados: [{ nome: 'Normal', url: TABELA, seletor: '.marcadores li', prepara: separador('Marcadores') }]
	},
	{
		id: 'C15',
		nome: 'Linha de informação',
		ficheiro: 'web/src/routes/jogo/[id]/InfoJogo.svelte (.info li)',
		grupo: 'Listas e cartões',
		oQueE: 'Uma linha de ícone e texto, nas informações do jogo.',
		onde: 'Ficha de jogo, separador Informações.',
		anatomia: ['ícone', 'texto', 'seta quando é ligação'],
		estados: [{ nome: 'Lista completa', url: JOGO_GOLEADA, seletor: 'ul.info', prepara: separador('Informações') }]
	},

	// ── Tabelas ──────────────────────────────────────────────────────────────────────────
	{
		id: 'C16',
		nome: 'Tabela de classificação',
		ficheiro: 'web/src/lib/TabelaClassificacao.svelte',
		grupo: 'Tabelas',
		oQueE: 'A tabela de pontos de uma prova, em duas densidades.',
		onde: 'Ecrã de prova, ecrã de equipa, ficha de um jogo por começar.',
		anatomia: ['cabeçalho de colunas', 'lugar', 'emblema', 'nome', 'números', 'pontos a negrito', 'linha destacada'],
		nota: 'Tem duas versões — simples e completa — porque a 375px as dez colunas não cabem. As primeiras duas colunas ficam fixas quando se rola de lado.',
		estados: [
			{ nome: 'Simples', url: TABELA, seletor: '.rolo' },
			{
				nome: 'Completa',
				url: TABELA,
				seletor: '.rolo',
				prepara: async (pag) => {
					await pag.getByRole('button', { name: 'Completa' }).first().click();
					await pag.waitForTimeout(300);
				}
			},
			{
				nome: 'Com a equipa destacada',
				url: `${EQUIPA}?aba=classificacao`,
				seletor: '.rolo',
				nota: 'A linha da equipa de quem está a ver leva fundo de acento fraco.'
			}
		]
	},
	{
		id: 'C17',
		nome: 'Tabela de Mérito',
		ficheiro: 'web/src/lib/TabelaMerito.svelte',
		grupo: 'Tabelas',
		oQueE: 'A classificação dos escalões de formação, onde não contam pontos mas o Mérito da Formação.',
		onde: 'Ecrã de prova e ecrã de equipa, nos Escolares e Benjamins.',
		anatomia: ['colunas J, B, Pen, Méd, P', 'penalizações a vermelho', 'linha destacada'],
		nota: 'Nestes escalões não conta quem ganha: conta levar a equipa completa e pôr toda a gente a jogar. É outra leitura, e por isso é outra tabela.',
		estados: [{ nome: 'Normal', url: MERITO, seletor: '.rolo' }]
	},
	{
		id: 'C18',
		nome: 'Ficha de equipas',
		ficheiro: 'web/src/lib/FichaEquipas.svelte',
		grupo: 'Tabelas',
		oQueE: 'A convocatória e as estatísticas de cada atleta, uma tabela por equipa.',
		onde: 'Ficha de jogo, separador Equipas.',
		anatomia: ['nome da equipa', 'número', 'nome do atleta', 'golos, assistências, defesas', 'cartões', 'titulares'],
		estados: [{ nome: 'Jogo terminado', url: JOGO_GOLEADA, seletor: 'section:has(table)', prepara: separador('Equipas') }]
	},
	{
		id: 'C19',
		nome: 'Boletim oficial',
		ficheiro: 'web/src/lib/BoletimOficial.svelte',
		grupo: 'Tabelas',
		oQueE: 'O resultado parte a parte, como vem do boletim da associação.',
		onde: 'Ficha de jogo, separador Informações.',
		anatomia: ['equipa', 'uma coluna por parte', 'total'],
		estados: [{ nome: 'Normal', url: JOGO_GOLEADA, seletor: 'section:has(table)', prepara: separador('Informações') }]
	},
	{
		id: 'C20',
		nome: 'Calendário do mês',
		ficheiro: 'web/src/lib/CalendarioMes.svelte',
		grupo: 'Tabelas',
		oQueE: 'A grelha de um mês com os jogos da equipa marcados.',
		onde: 'Ecrã de equipa, separador Jogos, vista de calendário.',
		anatomia: ['mês e setas', 'dias da semana', 'célula de dia', 'dia com jogo', 'emblema do adversário'],
		estados: [{ nome: 'Normal', url: `${EQUIPA}?aba=jogos&vista=calendario`, seletor: 'table.mes' }]
	},

	// ── Jogo ─────────────────────────────────────────────────────────────────────────────
	{
		id: 'C21',
		nome: 'Placar do jogo',
		ficheiro: 'web/src/routes/jogo/[id]/+page.svelte (.placar)',
		grupo: 'Jogo',
		oQueE: 'O cabeçalho da ficha de jogo: as duas equipas, o resultado e o estado.',
		onde: 'Ficha de jogo. Encolhe ao rolar e cola-se ao topo.',
		anatomia: ['voltar', 'crachá de escalão', 'emblema', 'nome', 'resultado', 'estado', 'marcadores por baixo de cada equipa'],
		nota: 'O fundo (--heroi) segue o tema e nunca é quase preto: os emblemas de contorno escuro — Lourinhã, Stuart, Sintra — desapareciam lá dentro.',
		estados: [
			{ nome: 'Jogo terminado', url: JOGO_FEITO, seletor: '.cromado' },
			{ nome: 'Jogo por começar', url: JOGO_POR_COMECAR, seletor: '.cromado' }
		]
	},
	{
		id: 'C22',
		nome: 'Cronologia',
		ficheiro: 'web/src/lib/Cronologia.svelte',
		grupo: 'Jogo',
		oQueE: 'Os lances do jogo por ordem inversa, com as partes marcadas.',
		onde: 'Ficha de jogo, separador Eventos.',
		anatomia: ['marca de parte com o resultado', 'relógio', 'bola de golo', 'nome de quem marcou', 'assistência', 'cartões'],
		estados: [{ nome: 'Jogo com 61 lances', url: JOGO_FEITO, seletor: 'ol.linha', prepara: separador('Eventos do jogo') }]
	},
	{
		id: 'C23',
		nome: 'Bola de golo',
		ficheiro: 'web/src/lib/Bola.svelte',
		grupo: 'Jogo',
		oQueE: 'A bola que marca um golo na cronologia. Desenho próprio, não é um ícone de traço.',
		onde: 'Cronologia.',
		anatomia: ['corpo', 'brilho'],
		estados: [{ nome: 'Normal', url: JOGO_FEITO, seletor: 'svg.bola', prepara: separador('Eventos do jogo'), margem: 24 }]
	},

	// ── Indicadores ──────────────────────────────────────────────────────────────────────
	{
		id: 'C24',
		nome: 'Emblema de clube',
		ficheiro: 'web/src/lib/Emblema.svelte',
		grupo: 'Indicadores',
		oQueE: 'O emblema do clube, a 18–32px. Quando não há, um círculo com as iniciais.',
		onde: 'Em quase todos os ecrãs.',
		anatomia: ['imagem do emblema', 'recuo: círculo com iniciais, de cor estável pelo nome'],
		nota: 'Os emblemas vêm da associação e não se redesenham — são 31 WebP de 64px. O que é nosso, e pode ser redesenhado, é o círculo de recuo.',
		estados: [{ nome: 'Lista de emblemas', url: TABELA, seletor: '.rolo tbody', margem: 0 }]
	},
	{
		id: 'C25',
		nome: 'Crachá de escalão',
		ficheiro: 'web/src/lib/CrachaEscalao.svelte',
		grupo: 'Indicadores',
		oQueE: 'O selo redondo de cada um dos onze escalões.',
		onde: 'Placar do jogo (18px) e cartões de competição (grande).',
		anatomia: ['círculo', 'texto curvo', 'sigla'],
		estados: [{ nome: 'Os onze, em grande', url: '/competicoes', seletor: 'ul.grelha' }]
	},
	{
		id: 'C26',
		nome: 'Forma recente',
		ficheiro: 'web/src/lib/FormaRecente.svelte',
		grupo: 'Indicadores',
		oQueE: 'Os cinco últimos jogos de uma equipa, com a data, o adversário e o resultado colorido.',
		onde: 'Ecrã de equipa, separador Resumo.',
		anatomia: ['data', 'emblema do adversário', 'pílula do resultado', 'cor por vitória, empate e derrota'],
		estados: [{ nome: 'Cinco jogos', url: `${EQUIPA}?aba=resumo`, seletor: '.forma' }]
	},
	{
		id: 'C27',
		nome: 'Idade dos dados',
		ficheiro: 'web/src/lib/Desatualizado.svelte',
		grupo: 'Indicadores',
		oQueE: 'O "há 11h" ao lado da marca: há quanto tempo os dados foram buscados.',
		onde: 'Cabeçalho, em todos os ecrãs.',
		anatomia: ['texto relativo'],
		estados: [{ nome: 'Normal', url: '/', seletor: '.idade', margem: 20 }]
	},
	{
		id: 'C28',
		nome: 'Rótulo de não oficial',
		ficheiro: 'web/src/lib/RotuloCalculada.svelte',
		grupo: 'Indicadores',
		oQueE: 'O aviso de que a classificação foi calculada por nós, porque a associação não a publica.',
		onde: 'Ecrã de prova e ecrã de equipa, nas provas sem tabela publicada.',
		anatomia: ['texto', 'ligação para a explicação'],
		nota: 'Não é enfeite nem rodapé: é a promessa de não passar por oficial o que não é. Tem de se ler.',
		estados: [
			{
				nome: 'Normal',
				url: `${EQUIPA}?aba=classificacao`,
				seletor: '.calculada',
				forjar: { padrao: PROVAS, transformar: tabelaCalculada },
				forcado:
					'Nenhuma das 23 provas com tabela está hoje a ser calculada por nós — todas têm a oficial. A resposta do servidor foi reescrita para pôr a tabela no lugar da calculada.'
			}
		]
	},
	{
		id: 'C29',
		nome: 'Botão de seguir',
		ficheiro: 'web/src/routes/equipa/[cat]/[nome]/+page.svelte (.seguir)',
		grupo: 'Indicadores',
		oQueE: 'O botão que segue ou deixa de seguir uma equipa, com dois estados bem diferentes.',
		onde: 'Ecrã de equipa.',
		anatomia: ['contorno', 'visto quando já segue', 'rótulo'],
		estados: [
			{ nome: 'A seguir', url: `${EQUIPA}?aba=resumo`, seletor: '.seguir', margem: 20 },
			{
				nome: 'Por seguir',
				url: '/equipa/sub-19/hc-lourinha?aba=resumo',
				seletor: '.seguir',
				margem: 20,
				nota: 'Uma equipa que não está na lista de favoritos da captura.'
			}
		]
	},

	// ── Acções ───────────────────────────────────────────────────────────────────────────
	{
		id: 'C30',
		nome: 'Botão de acção',
		ficheiro: 'web/src/lib/AdicionarCalendario.svelte (.abrir)',
		grupo: 'Acções',
		oQueE: 'O botão de largura inteira com ícone e texto, para a acção principal de um ecrã.',
		onde: 'Ecrã de equipa, ecrã de prova.',
		anatomia: ['ícone', 'rótulo', 'contorno'],
		estados: [
			{
				nome: 'Adicionar ao calendário',
				url: `${EQUIPA}?aba=jogos&vista=calendario`,
				seletor: '.abrir'
			}
		]
	},
	{
		id: 'C31',
		nome: 'Bolha de opinião',
		ficheiro: 'web/src/lib/Feedback.svelte (.bolha)',
		grupo: 'Acções',
		oQueE: 'O botão redondo flutuante que abre a caixa de "o que está mal".',
		onde: 'Em todos os ecrãs, por cima da barra de secções.',
		anatomia: ['círculo de acento', 'ícone de balão'],
		nota: 'Já esteve por cima de resultados e tapava-os — foi queixa de um utilizador. A reserva de espaço no fundo da página existe por causa dela.',
		estados: [{ nome: 'Normal', url: '/', seletor: '.bolha', margem: 20 }]
	},
	{
		id: 'C32',
		nome: 'Ícones',
		ficheiro: 'web/src/lib/Icone.svelte',
		grupo: 'Acções',
		oQueE: 'Os 26 ícones da aplicação, todos de traço, numa grelha de 20×20.',
		onde: 'Menu, informações do jogo, separadores, barra de secções.',
		anatomia: ['traço de 1,8', 'pontas e juntas redondas', 'cor por currentColor'],
		nota: 'Estão todos no catálogo, um a um, mais abaixo. São o trabalho mais fácil de integrar que há aqui.',
		estados: []
	},

	// ── Sobreposições ────────────────────────────────────────────────────────────────────
	{
		id: 'C33',
		nome: 'Menu',
		ficheiro: 'web/src/lib/MenuMais.svelte',
		grupo: 'Sobreposições',
		oQueE: 'A gaveta que desce do ☰, com as opções e as escolhas de tema e de cor.',
		onde: 'Em todos os ecrãs.',
		anatomia: ['véu', 'linha com ícone, rótulo e ajuda', 'escolha de tema', 'escolha de cor', 'rodapé'],
		estados: [
			{
				nome: 'Aberto',
				url: '/',
				seletor: '.menu, .gaveta, [role=dialog]',
				prepara: async (pag) => {
					await pag.getByRole('button', { name: 'Mais opções' }).click();
					await pag.waitForTimeout(500);
				}
			}
		]
	},
	{
		id: 'C34',
		nome: 'Caixa de opinião',
		ficheiro: 'web/src/lib/Feedback.svelte (.painel)',
		grupo: 'Sobreposições',
		oQueE: 'O painel onde se escreve o que está mal, com o aviso de privacidade antes do campo.',
		onde: 'Em todos os ecrãs, a partir da bolha.',
		anatomia: ['cabeça com fechar', 'aviso', 'campo de texto', 'contagem', 'botões'],
		nota: 'O aviso vem **antes** de a pessoa escrever, não depois. É a única caixa da aplicação que guarda texto de outra pessoa.',
		estados: [
			{
				nome: 'Aberta',
				url: '/',
				seletor: '.painel',
				prepara: async (pag) => {
					await pag.getByRole('button', { name: 'Dar uma opinião sobre a aplicação' }).click();
					await pag.waitForTimeout(500);
				}
			}
		]
	},
	{
		id: 'C35',
		nome: 'Folha de baixo',
		ficheiro: 'web/src/lib/Folha.svelte',
		grupo: 'Sobreposições',
		oQueE: 'A folha que sobe do fundo do ecrã, com título e fechar. Serve de base a várias caixas.',
		onde: 'Adicionar ao calendário, escolher competição, partilhar.',
		anatomia: ['véu', 'cabeçalho com título e ✕', 'corpo'],
		estados: [
			{
				nome: 'Aberta',
				url: `${EQUIPA}?aba=jogos&vista=calendario`,
				seletor: 'dialog[open]',
				prepara: async (pag) => {
					await pag.locator('.abrir').first().click();
					await pag.waitForTimeout(600);
				}
			}
		]
	},
	{
		id: 'C36',
		nome: 'Passo do guia',
		ficheiro: 'web/src/lib/Holofote.svelte',
		grupo: 'Sobreposições',
		oQueE: 'O passeio pelos ecrãs que se oferece a quem chega: escurece a página e ilumina uma parte.',
		onde: 'Primeira visita.',
		anatomia: ['véu', 'recorte iluminado', 'cartão com título, texto e botões'],
		estados: [
			{
				nome: 'Um passo',
				url: '/',
				seletor: '.cartao',
				chaves: { 'hoquei:guia-visto:v2': null },
				nota: 'O guia navega sozinho entre ecrãs, por isso o passo capturado pode não ser o primeiro.'
			}
		]
	},
	{
		id: 'C37',
		nome: 'Escolher equipas',
		ficheiro: 'web/src/lib/EscolherClubes.svelte',
		grupo: 'Sobreposições',
		oQueE: 'A grelha de clubes para escolher quem se segue, com selo de seleccionado.',
		onde: 'O Meu Clube, na primeira visita e a partir do botão.',
		anatomia: ['cabeça', 'grelha de clubes', 'selo de escolhido', 'nome', 'rodapé com botão'],
		estados: [{ nome: 'Grelha', url: '/clube', seletor: '.grelha', semFavoritos: true }]
	},

	// ── Texto e estados ──────────────────────────────────────────────────────────────────
	{
		id: 'C38',
		nome: 'Chapéu do Mérito',
		ficheiro: 'web/src/lib/ChapeuMerito.svelte',
		grupo: 'Texto e estados',
		oQueE: 'O parágrafo que explica, antes da tabela, que naqueles escalões não conta quem ganha.',
		onde: 'Ecrã de prova e ecrã de equipa, nos escalões de formação.',
		anatomia: ['texto corrido com palavras a negrito'],
		estados: [{ nome: 'Normal', url: MERITO, seletor: '.chapeu' }]
	},
	{
		id: 'C39',
		nome: 'Secção que se abre',
		ficheiro: 'web/src/lib/LegendaMerito.svelte, RegrasMerito.svelte',
		grupo: 'Texto e estados',
		oQueE: 'Um título que se toca e abre a explicação por baixo.',
		onde: 'Por baixo das tabelas de Mérito.',
		anatomia: ['título', 'conteúdo quando aberto'],
		estados: [
			{ nome: 'Fechada', url: MERITO, seletor: 'details.legenda' },
			{
				nome: 'Aberta',
				url: MERITO,
				seletor: 'details.legenda',
				prepara: async (pag) => {
					await pag.locator('details.legenda summary').first().click();
					await pag.waitForTimeout(300);
				}
			}
		]
	},
	{
		id: 'C40',
		nome: 'Estado vazio',
		ficheiro: 'web/src/lib/PaginaDia.svelte (.vazio), clube/+page.svelte (.vazio)',
		grupo: 'Texto e estados',
		oQueE: 'O que aparece quando não há nada para mostrar. Convida em vez de informar.',
		onde: 'Procura sem resultados.',
		anatomia: ['texto', 'acção quando há uma'],
		nota: 'Duas coisas verificadas a 19/10/2026, e as duas mudam o que há para desenhar. O "dia sem jogos" existe no código e **não se alcança a usar a app**: a fita de dias só oferece dias que têm jogos. E "O Meu Clube" sem equipas **não mostra um estado vazio** — mostra directamente a grelha de escolher clubes (C37), que é melhor desenho: convida em vez de informar.',
		estados: [
			{
				nome: 'Procura sem resultados',
				url: '/procurar',
				seletor: '.nada',
				prepara: async (pag) => {
					await pag.locator('input').first().fill('zzzz');
					await pag.waitForTimeout(500);
				}
			}
		]
	},
	{
		id: 'C41',
		nome: 'Página de erro',
		ficheiro: 'web/src/routes/+error.svelte',
		grupo: 'Texto e estados',
		oQueE: 'O que aparece quando um endereço não existe ou os dados não carregam.',
		onde: 'Qualquer endereço que falhe.',
		anatomia: ['mensagem', 'dica', 'botão de voltar'],
		nota: 'Não é um beco: tem sempre uma saída.',
		estados: [{ nome: 'Página que não existe', url: '/isto-nao-existe', seletor: '.erro' }]
	},
	{
		id: 'C42',
		nome: 'Cabeçalho de equipa',
		ficheiro: 'web/src/routes/equipa/[cat]/[nome]/+page.svelte (header.topo)',
		grupo: 'Texto e estados',
		oQueE: 'O cabeçalho do ecrã de uma equipa: emblema, nome, escalão e o botão de seguir.',
		onde: 'Ecrã de equipa.',
		anatomia: ['emblema grande', 'nome do clube', 'escalão', 'botão de seguir'],
		estados: [{ nome: 'Normal', url: `${EQUIPA}?aba=resumo`, seletor: 'header.topo' }]
	},
	{
		id: 'C43',
		nome: 'Cabeçalho de prova',
		ficheiro: 'web/src/routes/competicoes/[grupo]/+page.svelte (header.titulo)',
		grupo: 'Texto e estados',
		oQueE: 'O cabeçalho do ecrã de uma prova: escalão, nome e número de séries.',
		onde: 'Ecrã de prova.',
		anatomia: ['escalão em acento', 'nome da prova', 'número de séries'],
		estados: [{ nome: 'Normal', url: TABELA, seletor: 'header.titulo' }]
	}
];
