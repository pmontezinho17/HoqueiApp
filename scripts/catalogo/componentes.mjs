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
 * ## Os identificadores não se reciclam, e um deles mudou de nome
 *
 * Entre 19/10 e 12/11/2026 a aplicação andou muito: seis componentes novos e trinta e quatro
 * alterados. Os números que já existiam **ficaram onde estavam**, para não obrigar ninguém a
 * reconciliar uma lista a meio do trabalho, e os novos entram a partir do `C44`.
 *
 * Três excepções, e todas por o componente ter sido substituído e não acrescentado:
 *
 * - **C04** era "Pílulas de escalão" e passa a ser o **campo de selecção**. As pílulas
 *   desapareceram a 21/10 quando o filtro passou a `<select>` — um catálogo que lhes
 *   continuasse a chamar pílulas mandava desenhar o que já não existe.
 * - **C05** e **C06** eram "Separadores de texto" e "Separadores de ícone", que eram a mesma
 *   ideia em dois sítios. Agora há um `Separadores.svelte` só (C05), e o C06 passa a ser a
 *   **faixa que se arrasta**, que é o outro componente que estava escondido ali dentro.
 * - **C08** era "Interruptor de duas vias" e já não existe: as duas vistas passaram a ser
 *   mais uma `Escolha`. O número é agora a **barra fixa de controlos**, que apareceu no lugar
 *   dele.
 *
 * ## O que é um "estado" aqui
 *
 * Um componente desenha-se uma vez e vive em várias situações: a linha de um jogo que ainda
 * não começou não é a do jogo que acabou. Cada entrada em `estados` é uma dessas situações,
 * fotografada à parte. Um estado que não exista nos dados de hoje é **forçado** — e diz-se
 * que foi, no campo `forcado`, porque um catálogo que não distingue o que é real do que foi
 * encenado deixa de servir para medir fosse o que fosse. Um estado que não se consegue
 * alcançar de todo leva `porque` em vez de captura, e diz o que falta.
 *
 * ## Os campos
 *
 * - `id`, `nome`, `ficheiro` — a identidade. O `ficheiro` é onde o desenho entra.
 * - `grupo` — a arrumação do catálogo, à maneira do Material 3.
 * - `oQueE` — uma frase. O que é, não como está feito.
 * - `onde` — em que ecrãs aparece. É o que diz ao designer o que ele parte se mexer aqui.
 * - `anatomia` — as partes com nome, como nos diagramas que ele mandou.
 * - `estados` — `{ nome, url, seletor, nota?, prepara?, forjar?, forcado?, base?, aparelho? }`.
 *   O `seletor` é CSS e corre na página; o `prepara` é código do Playwright; o `forjar`
 *   reescreve a resposta do servidor antes de a página a ler; o `base` troca o endereço do
 *   site (só o site de testes mostra a faixa dele); o `aparelho` finge outro telemóvel.
 */

const MERITO = '/competicoes/escolares--encontros-distritais-escolares-1-fase-nivel-i';
const TABELA = '/competicoes/sub-19--camp-reg-sub-19-1-fase';
const EQUIPA = '/equipa/sub-19/cd-paco-arcos';
const JOGO_CRONO = '/jogo/10002';
const JOGO_MERITO = '/jogo/10000';

/** O site de testes, o único sítio onde a faixa do C51 aparece. */
export const TESTES = 'https://testes.hoquei.pages.dev';

/**
 * O dia que está **à frente**, no ecrã de Jogos.
 *
 * O `Faixa.svelte` monta três dias ao mesmo tempo — o de ontem e o de amanhã ficam fora do
 * ecrã, à espera de serem arrastados para dentro. Um selector solto apanha o vizinho, e o
 * `locator.screenshot()` vai buscá-lo onde ele está: a captura do bloco de escalão saiu com
 * o cabeçalho da aplicação lá dentro. Já tinha enganado um teste e o guia; depois enganou o
 * catálogo. Tudo o que se fotografa dentro de uma faixa passa por aqui.
 */
const DIA = 'main .pag:not(.esquerda):not(.direita)';

export const AGENDA = '**/v1/aplisboa/2026-27/agenda.json';
export const PROVAS = '**/v1/aplisboa/2026-27/comp/*.json';

/** Toca num separador pelo nome acessível. */
export const separador = (nome) => async (pag) => {
	await pag.getByRole('tab', { name: nome, exact: true }).first().click();
	await pag.waitForTimeout(600);
};

/**
 * Escolhe uma opção no enésimo campo de selecção da página.
 *
 * `alvo` é o valor da opção, ou `{ label: 'Tabela completa' }` pelo texto. Pelo texto é
 * preciso quando a opção não tem um valor que se possa escrever: as colunas da tabela são
 * `true` e `false`, e o valor que vai parar ao HTML é inventado pelo Svelte.
 */
const escolher = (indice, alvo) => async (pag) => {
	await pag.locator('select').nth(indice).selectOption(alvo);
	await pag.waitForTimeout(600);
};

/**
 * Põe o primeiro jogo da agenda a decorrer, agora.
 *
 * O `emCurso()` do `formato.ts` exige três coisas ao mesmo tempo: `ao_vivo`, o dia de hoje,
 * e a hora de início já passada mas dentro da janela. Encenar menos do que isto dava uma
 * linha normal e uma captura a dizer o que não era.
 */
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

/**
 * Passa a tabela oficial de uma prova a tabela calculada por nós.
 *
 * O `tabelasDe()` do `classificacao.ts` só considera a nossa quando a oficial vem vazia, e é
 * a nossa que acende o rótulo de "não oficial". Medido a 12/11/2026: nenhuma das provas com
 * tabela está nesse caso, e sem isto o rótulo não existiria em captura nenhuma. É um estado
 * real do produto, só não é o estado de hoje.
 */
export function tabelaCalculada(prova) {
	if (!prova.classificacao?.length) return prova;
	return { ...prova, classificacao: [], classificacao_calculada: prova.classificacao };
}

export const COMPONENTES = [
	// ── Navegação ────────────────────────────────────────────────────────────────────────
	{
		id: 'C01',
		nome: 'Barra de secções',
		ficheiro: 'web/src/routes/+layout.svelte (nav.barra)',
		grupo: 'Navegação',
		oQueE: 'A barra fixa no fundo do ecrã, com as três secções da aplicação.',
		onde: 'Em todos os ecrãs, sempre visível.',
		anatomia: ['ícone', 'rótulo', 'contador de equipas seguidas', 'secção escolhida a cor de acento'],
		nota: 'Desde 31/10/2026 **recolhe ao rolar para baixo** e volta ao rolar para cima: num telemóvel pequeno 52 px fixos são muito do pouco que há. Recolhida fica só a fila de ícones, sem rótulos.',
		estados: [
			{ nome: 'Jogos escolhido', url: '/', seletor: 'nav.barra' },
			{ nome: 'O Meu Clube escolhido, com contador', url: '/clube', seletor: 'nav.barra' },
			{
				nome: 'Recolhida',
				url: TABELA,
				seletor: 'nav.barra',
				prepara: async (pag) => {
					await pag.mouse.wheel(0, 900);
					await pag.waitForTimeout(700);
				},
				nota: 'Ao rolar para baixo os rótulos desaparecem e fica a fila de ícones.'
			}
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
		anatomia: ['dia da semana', 'dia e mês', 'dia escolhido', 'marca de hoje'],
		nota: 'Só oferece dias que **têm jogos** — por isso não há maneira de chegar a um dia vazio. E publica a sua própria altura para fora, porque a barra de controlos (C08) cola por baixo dela e um número escrito à mão deixaria de servir no dia em que a fita mudasse.',
		estados: [{ nome: 'Com o dia de hoje escolhido', url: '/', seletor: '[data-guia=dias]' }]
	},
	{
		id: 'C04',
		nome: 'Campo de selecção',
		ficheiro: 'web/src/lib/Escolha.svelte',
		grupo: 'Navegação',
		oQueE: 'Um campo de selecção do sistema, com o rótulo dentro da própria opção escolhida.',
		onde: 'Ecrã de Jogos (filtrar escalão, agrupar), ecrã de prova (série, densidade da tabela), ecrã de equipa (prova).',
		anatomia: ['opção escolhida', 'seta', 'lista do sistema ao tocar'],
		nota: 'Substituiu as pílulas de escalão a 21/10/2026. **É um controlo do sistema e não um desenho nosso**: a lista que abre é a do iOS ou a do Android, e nenhuma delas se desenha. O que se pode desenhar é a caixa fechada — e o rótulo vai dentro do texto ("Agrupar: Escalão") precisamente para não gastar uma linha por cima.',
		estados: [
			{ nome: 'Dois, lado a lado', url: '/', seletor: '.controlos' },
			{ nome: 'Três, no ecrã de prova', url: TABELA, seletor: '.fixo' }
		]
	},
	{
		id: 'C05',
		nome: 'Separadores',
		ficheiro: 'web/src/lib/Separadores.svelte',
		grupo: 'Navegação',
		oQueE: 'A fila de separadores: ícone por cima, rótulo por baixo, sublinhado no escolhido.',
		onde: 'Ficha de jogo, ecrã de prova, ecrã de equipa.',
		anatomia: ['ícone', 'rótulo', 'sublinhado do escolhido'],
		nota: 'Eram dois componentes diferentes — texto nuns ecrãs, ícones na ficha de jogo — e passaram a um só. Na ficha de jogo chegam a ser **seis**, e é aí que o desenho aperta.',
		estados: [
			{ nome: 'Seis, na ficha de jogo', url: JOGO_MERITO, seletor: '.tabs' },
			{ nome: 'Três, numa prova', url: TABELA, seletor: '.tabs' },
			{ nome: 'Cinco, numa equipa', url: `${EQUIPA}?aba=resumo`, seletor: '.tabs' }
		]
	},
	{
		id: 'C06',
		nome: 'Faixa que se arrasta',
		ficheiro: 'web/src/lib/Faixa.svelte',
		grupo: 'Navegação',
		oQueE: 'O recipiente que deixa passar de um separador para o outro com o dedo.',
		onde: 'Ecrã de Jogos (dias), ficha de jogo, ecrã de prova, ecrã de equipa.',
		anatomia: ['página à vista', 'páginas vizinhas montadas fora do ecrã', 'arrasto'],
		nota: 'Não se vê — é ele que faz o conteúdo acompanhar o dedo. Está aqui porque **três páginas estão montadas ao mesmo tempo**, e isso muda o que um desenho pode assumir: o que está fora do ecrã existe, ocupa memória e já enganou um teste, o guia e este catálogo.',
		estados: [{ nome: 'Com um dia à vista', url: '/', seletor: 'main .faixa' }]
	},
	{
		id: 'C07',
		nome: 'Selector de prova',
		ficheiro: 'web/src/lib/SeletorCompeticao.svelte',
		grupo: 'Navegação',
		oQueE: 'Um botão que mostra a prova actual e abre a lista das outras.',
		onde: 'Em lado nenhum.',
		anatomia: ['crachá de escalão', 'nome da prova', 'seta'],
		nota: 'Verificado outra vez a 12/11/2026: **nenhum ecrã o importa**. Era o antepassado do campo de selecção (C04) e ficou para trás. Fica no catálogo porque existe no código; não vale a pena desenhá-lo sem alguém decidir primeiro se volta.',
		estados: []
	},
	{
		id: 'C08',
		nome: 'Barra fixa de controlos',
		ficheiro: 'web/src/lib/TopoFixo.svelte',
		grupo: 'Navegação',
		oQueE: 'A faixa que cola ao topo ao rolar e leva os separadores e os campos de selecção do ecrã.',
		onde: 'Ecrã de prova e ecrã de equipa.',
		anatomia: ['separadores', 'campos de selecção', 'sombra quando está colada'],
		nota: 'Numa tabela de 20 linhas, perder os separadores ao rolar obrigava a voltar ao topo só para mudar de vista.',
		estados: [
			{ nome: 'Numa prova', url: TABELA, seletor: '.fixo' },
			{ nome: 'Numa equipa', url: `${EQUIPA}?aba=classificacao`, seletor: '.fixo' }
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
		anatomia: ['hora ou estado', 'jornada', 'emblema', 'nome da equipa', 'resultado', 'vencedor a negrito', 'câmara quando há transmissão', 'barras do Mérito nos escalões de formação'],
		nota: 'As equipas estão empilhadas e não lado a lado: medido, 15 de 34 nomes de um domingo apareciam cortados no desenho simétrico. É o componente mais visto da aplicação, e **a linha inteira é um só alvo** — as equipas deixaram de ser clicáveis a 20/10, depois de o dono se enganar a abrir o clube em vez do jogo.',
		estados: [
			{
				nome: 'Jogo terminado',
				url: TABELA,
				seletor: 'main .linha:has(.golos)',
				prepara: separador('Calendário')
			},
			{
				nome: 'Jogo por começar',
				url: TABELA,
				seletor: 'main .linha:not(:has(.golos))',
				prepara: separador('Calendário')
			},
			{
				nome: 'Jogo a decorrer',
				url: '/',
				seletor: `${DIA} .linha:has(.vivo)`,
				forjar: { padrao: AGENDA, transformar: jogoADecorrer },
				forcado: 'Não havia nenhum jogo a decorrer no momento da captura. A agenda foi reescrita antes de a página a ler.',
				nota: 'O ponto a pulsar e a fase do jogo substituem a hora. A fase é mais útil do que "AO VIVO": é ela que diz se vale a pena entrar.'
			},
			{
				nome: 'Com as barras do Mérito',
				url: MERITO,
				seletor: 'main .linha:has(.merito)',
				prepara: separador('Calendário'),
				nota: 'Nos Escolares e Benjamins o que conta não é quem ganhou, e a linha mostra as duas contagens de Mérito em barras em vez do resultado seco.'
			}
		]
	},
	{
		id: 'C10',
		nome: 'Bloco de jogos',
		ficheiro: 'web/src/lib/PaginaDia.svelte (.bloco)',
		grupo: 'Listas e cartões',
		oQueE: 'O agrupador dos jogos de um dia: cabeçalho que se fecha, com contagem.',
		onde: 'Ecrã de Jogos.',
		anatomia: ['título do grupo', 'contagem', 'seta de fechar', 'nome da prova', 'nome da série', 'linhas de jogo'],
		nota: 'Agrupa de três maneiras desde 21/10/2026, à escolha no C04. Por hora **não leva cabeçalho nenhum** — a hora já vai em cada linha, e medido em 24 dos 56 dias com jogos cada caixa por hora teria exactamente um jogo lá dentro.',
		estados: [
			{ nome: 'Por escalão', url: '/', seletor: `${DIA} .bloco` },
			{
				nome: 'Por local',
				url: '/',
				seletor: `${DIA} .bloco`,
				prepara: escolher(1, 'local'),
				nota: 'Um cartão por pavilhão, por ordem alfabética, cada um abre e fecha.'
			},
			{
				nome: 'Por hora',
				url: '/',
				seletor: `${DIA} .bloco`,
				prepara: escolher(1, 'hora'),
				nota: 'Uma caixa só, por ordem de relógio e sem cabeçalho.'
			}
		]
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
		ficheiro: 'web/src/routes/competicoes/+page.svelte (ul.grelha li)',
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
		anatomia: ['lugar', 'nome do atleta', 'emblema e clube', 'golos', 'assistências', 'jogos'],
		nota: 'Ganhou uma linha de chave por cima a 20/10/2026, depois de uma utilizadora perguntar se os golos eram de um jogo só. Os dados estavam certos — faltava o ecrã dizer o que o número era.',
		estados: [
			{ nome: 'Normal', url: TABELA, seletor: '.marcadores li', prepara: separador('Marcadores') },
			{
				nome: 'A chave dos números',
				url: TABELA,
				seletor: '.chave',
				prepara: separador('Marcadores'),
				nota: 'A frase que diz de quantos jogos é o total e o que cada letra quer dizer.'
			}
		]
	},
	{
		id: 'C15',
		nome: 'Linha de informação',
		ficheiro: 'web/src/routes/jogo/[id]/InfoJogo.svelte (.info li)',
		grupo: 'Listas e cartões',
		oQueE: 'Uma linha de ícone e texto, nas informações do jogo.',
		onde: 'Ficha de jogo, separador Informações.',
		anatomia: ['ícone', 'texto', 'seta quando é ligação'],
		estados: [
			{ nome: 'Lista completa', url: JOGO_MERITO, seletor: 'ul.info', prepara: separador('Informações') }
		]
	},

	// ── Tabelas ──────────────────────────────────────────────────────────────────────────
	{
		id: 'C16',
		nome: 'Tabela de classificação',
		ficheiro: 'web/src/lib/TabelaClassificacao.svelte',
		grupo: 'Tabelas',
		oQueE: 'A tabela de pontos de uma prova, em duas densidades.',
		onde: 'Ecrã de prova, ecrã de equipa, ficha de jogo.',
		anatomia: ['cabeçalho de colunas', 'lugar', 'emblema', 'nome', 'números', 'pontos a negrito', 'linha destacada'],
		nota: 'Tem duas densidades — simples e completa — porque a 375 px as dez colunas não cabem. As primeiras duas colunas ficam fixas quando se rola de lado.',
		estados: [
			{ nome: 'Simples', url: TABELA, seletor: '.rolo' },
			{
				nome: 'Completa',
				url: TABELA,
				seletor: '.rolo',
				prepara: escolher(1, { label: 'Tabela completa' }),
				nota: 'A densidade escolhe-se num campo de selecção, não num interruptor.'
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
		onde: 'Ecrã de prova, ecrã de equipa e ficha de jogo, nos Escolares e Benjamins.',
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
		anatomia: ['nome da equipa', 'número', 'nome do atleta', 'titular', 'golos, assistências, defesas', 'cartões por cor', 'meias partes jogadas', 'equipa técnica'],
		nota: 'Cresceu muito desde 19/10: ganhou as meias partes de cada atleta (que é o que o Mérito mede), os cartões por cor, e a equipa técnica. É a tabela mais densa da aplicação.',
		estados: [
			{
				nome: 'Jogo terminado',
				url: JOGO_MERITO,
				seletor: 'main section:has(table)',
				prepara: separador('Equipas')
			}
		]
	},
	{
		id: 'C19',
		nome: 'Boletim oficial',
		ficheiro: 'web/src/lib/BoletimOficial.svelte',
		grupo: 'Tabelas',
		oQueE: 'O resultado parte a parte, como vem do boletim da associação.',
		onde: 'Ficha de jogo, separador Informações.',
		anatomia: ['equipa', 'uma coluna por parte', 'total'],
		estados: [
			{
				nome: 'Normal',
				url: JOGO_MERITO,
				seletor: 'main section:has(table)',
				prepara: separador('Informações')
			}
		]
	},
	{
		id: 'C20',
		nome: 'Calendário do mês',
		ficheiro: 'web/src/lib/CalendarioMes.svelte',
		grupo: 'Tabelas',
		oQueE: 'A grelha de um mês com os jogos da equipa marcados.',
		onde: 'Ecrã de equipa, separador Calendário.',
		anatomia: ['mês e setas', 'dias da semana', 'célula de dia', 'dia com jogo', 'emblema do adversário'],
		nota: 'Passou a separador próprio a 31/10/2026 — era uma vista dentro de "Jogos".',
		estados: [{ nome: 'Normal', url: `${EQUIPA}?aba=calendario`, seletor: 'table.mes' }]
	},
	{
		id: 'C46',
		nome: 'Legenda da classificação',
		ficheiro: 'web/src/lib/LegendaClassificacao.svelte',
		grupo: 'Tabelas',
		oQueE: 'A explicação das colunas da tabela, fechada por omissão.',
		onde: 'Por baixo da última tabela de cada ecrã de prova, de equipa e de jogo.',
		anatomia: ['título que se toca', 'sigla e significado', 'nota sobre o traço nas assistências'],
		nota: '**Uma por ecrã e não uma por tabela.** Numa prova com séries repetia-se por baixo de cada uma, e ao rolar o dono via-a sempre a subir — pediu-a só no fim a 31/10/2026.',
		estados: [
			{ nome: 'Fechada', url: TABELA, seletor: 'details.legenda' },
			{
				nome: 'Aberta',
				url: TABELA,
				seletor: 'details.legenda',
				prepara: async (pag) => {
					await pag.locator('details.legenda summary').first().click();
					await pag.waitForTimeout(400);
				}
			}
		]
	},

	// ── Jogo ─────────────────────────────────────────────────────────────────────────────
	{
		id: 'C21',
		nome: 'Placar do jogo',
		ficheiro: 'web/src/routes/jogo/[id]/+page.svelte (.cromado)',
		grupo: 'Jogo',
		oQueE: 'O cabeçalho da ficha de jogo: as duas equipas, o resultado, o estado e as faltas.',
		onde: 'Ficha de jogo. Encolhe ao rolar e cola-se ao topo.',
		anatomia: ['voltar', 'crachá de escalão', 'emblema (abre a equipa)', 'nome', 'resultado', 'parte do jogo', 'faltas de cada equipa', 'marcadores por baixo de cada equipa'],
		nota: 'O fundo (--heroi) segue o tema e nunca é quase preto: os emblemas de contorno escuro — Lourinhã, Stuart, Sintra — desapareciam lá dentro. As faltas entraram a 21/10 e aparecem **assim que o jogo começa**, não só ao vivo; num jogo por começar a fonte publica campos vazios e um `0 – 0` de faltas seria um número inventado.',
		estados: [
			{ nome: 'Jogo terminado, com faltas', url: JOGO_MERITO, seletor: '.cromado' },
			{ nome: 'Com cronologia longa', url: JOGO_CRONO, seletor: '.cromado' }
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
		estados: [
			{ nome: 'Jogo cheio de lances', url: JOGO_CRONO, seletor: 'ol.linha', prepara: separador('Eventos do jogo') }
		]
	},
	{
		id: 'C23',
		nome: 'Bola de golo',
		ficheiro: 'web/src/lib/Bola.svelte',
		grupo: 'Jogo',
		oQueE: 'A bola que marca um golo na cronologia. Desenho próprio, não é um ícone de traço.',
		onde: 'Cronologia.',
		anatomia: ['corpo', 'brilho'],
		estados: [
			{ nome: 'Normal', url: JOGO_CRONO, seletor: 'svg.bola', prepara: separador('Eventos do jogo') }
		]
	},
	{
		id: 'C44',
		nome: 'Antes do jogo',
		ficheiro: 'web/src/routes/jogo/[id]/AntesDoJogo.svelte',
		grupo: 'Jogo',
		oQueE: 'O separador que compara as duas equipas antes do apito: forma, confronto directo, a época, quando marcam, sequências, disciplina e treinadores.',
		onde: 'Ficha de jogo, separador Pré-jogo.',
		anatomia: ['secção com título', 'linha comparada (rótulo ao centro, um valor de cada lado)', 'cartão da forma', 'resumo do confronto', 'aviso de que os números são de antes do jogo'],
		nota: 'É o maior componente da aplicação e o mais recente — sete secções, todas com a mesma ideia: **o rótulo ao centro e as duas equipas de cada lado**. Num jogo já disputado continua lá, com um aviso a dizer que nada do que se jogou depois entra nestes números.',
		estados: [
			{
				nome: 'As sete secções',
				url: JOGO_MERITO,
				seletor: 'main',
				prepara: separador('Pré-jogo'),
				nota: 'Capturado o separador inteiro: é a única forma de se ver o ritmo das sete secções seguidas.'
			},
			{
				nome: 'Uma linha comparada',
				url: JOGO_MERITO,
				seletor: '.cartao.lado-a-lado',
				prepara: separador('Pré-jogo'),
				nota: 'O padrão que se repete em cinco das sete secções. É este que compensa desenhar primeiro.'
			}
		]
	},
	{
		id: 'C45',
		nome: 'Mérito deste jogo',
		ficheiro: 'web/src/routes/jogo/[id]/MeritoDoJogo.svelte',
		grupo: 'Jogo',
		oQueE: 'A conta do Mérito deste jogo, regra a regra, com as duas equipas lado a lado.',
		onde: 'Ficha de jogo, separador Mérito, nos Escolares e Benjamins.',
		anatomia: ['placar do Mérito', 'uma linha por regra', 'detalhe de cada bonificação e penalização', 'aviso de não oficial'],
		nota: 'Separador próprio e não por baixo da classificação, por decisão do dono a 27/10/2026: o Mérito de um jogo é informação **deste jogo**, como os eventos e o boletim. Por baixo da tabela da série ficava depois de 6 a 10 linhas e de uma legenda, e quase ninguém lá chegava.',
		estados: [
			{
				nome: 'A conta completa',
				url: JOGO_MERITO,
				seletor: 'main section:has(h3)',
				prepara: separador('Mérito deste jogo')
			}
		]
	},

	// ── Indicadores ──────────────────────────────────────────────────────────────────────
	{
		id: 'C24',
		nome: 'Emblema de clube',
		ficheiro: 'web/src/lib/Emblema.svelte',
		grupo: 'Indicadores',
		oQueE: 'O emblema do clube, a 18–32 px. Quando não há, um círculo com as iniciais.',
		onde: 'Em quase todos os ecrãs.',
		anatomia: ['imagem do emblema', 'recuo: círculo com iniciais, de cor estável pelo nome'],
		nota: 'Os emblemas vêm da associação e **não se redesenham** — são WebP de 64 px, encolhidos por nós. O que é nosso, e pode ser redesenhado, é o círculo de recuo.',
		estados: [{ nome: 'Uma coluna de emblemas', url: TABELA, seletor: '.rolo tbody' }]
	},
	{
		id: 'C25',
		nome: 'Crachá de escalão',
		ficheiro: 'web/src/lib/CrachaEscalao.svelte',
		grupo: 'Indicadores',
		oQueE: 'O selo redondo de cada um dos onze escalões.',
		onde: 'Placar do jogo (18 px) e cartões de competição (grande).',
		anatomia: ['círculo', 'texto curvo', 'sigla'],
		estados: [{ nome: 'Os onze, em grande', url: '/competicoes', seletor: 'ul.grelha' }]
	},
	{
		id: 'C26',
		nome: 'Forma recente',
		ficheiro: 'web/src/lib/FormaRecente.svelte',
		grupo: 'Indicadores',
		oQueE: 'Os últimos jogos de uma equipa, com a data, o adversário e o resultado colorido.',
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
		estados: [{ nome: 'Normal', url: '/', seletor: '.idade' }]
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
				forcado: 'Nenhuma prova com tabela está hoje a ser calculada por nós — todas têm a oficial. A resposta do servidor foi reescrita para pôr a tabela no lugar da calculada.'
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
			{ nome: 'A seguir', url: `${EQUIPA}?aba=resumo`, seletor: '.seguir' },
			{
				nome: 'Por seguir',
				url: '/equipa/sub-19/hc-lourinha?aba=resumo',
				seletor: '.seguir',
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
		onde: 'Ecrã de equipa.',
		anatomia: ['ícone', 'rótulo', 'contorno'],
		estados: [
			{ nome: 'Adicionar ao calendário', url: `${EQUIPA}?aba=calendario`, seletor: '.abrir' }
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
		estados: [{ nome: 'Normal', url: '/', seletor: '.bolha' }]
	},
	{
		id: 'C32',
		nome: 'Ícones',
		ficheiro: 'web/src/lib/Icone.svelte',
		grupo: 'Acções',
		oQueE: 'Os 29 ícones da aplicação, todos de traço, numa grelha de 20×20.',
		onde: 'Menu, informações do jogo, separadores, barra de secções.',
		anatomia: ['traço de 1,8', 'pontas e juntas redondas', 'cor por currentColor'],
		nota: 'Eram 26 a 19/10 e são 29: entraram o `antes`, o `marcadores` e o `merito`, para os separadores novos. Estão todos no catálogo, um a um, mais abaixo.',
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
					await pag.waitForTimeout(600);
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
		anatomia: ['cabeça com fechar', 'aviso', 'campo de texto', 'contagem', 'vias de envio', 'botões'],
		nota: 'O aviso vem **antes** de a pessoa escrever, não depois. É a única caixa da aplicação que guarda texto de outra pessoa, e a política de privacidade enumera-a.',
		estados: [
			{
				nome: 'Aberta',
				url: '/',
				seletor: '.painel',
				prepara: async (pag) => {
					await pag.getByRole('button', { name: 'Dar uma opinião sobre a aplicação' }).click();
					await pag.waitForTimeout(600);
				}
			},
			{
				nome: 'Com texto escrito',
				url: '/',
				seletor: '.painel',
				prepara: async (pag) => {
					await pag.getByRole('button', { name: 'Dar uma opinião sobre a aplicação' }).click();
					await pag.waitForTimeout(400);
					await pag.locator('textarea').first().fill('No calendário do meu clube faltam os jogos de dezembro.');
					await pag.waitForTimeout(400);
				},
				nota: 'Com texto, aparecem a contagem e as vias de envio.'
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
				url: `${EQUIPA}?aba=calendario`,
				seletor: 'dialog[open]',
				prepara: async (pag) => {
					await pag.locator('.abrir').first().click();
					await pag.waitForTimeout(700);
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
	{
		id: 'C47',
		nome: 'Aviso de actualização',
		ficheiro: 'web/src/lib/AvisoVersao.svelte',
		grupo: 'Sobreposições',
		oQueE: 'A faixa que diz que há uma versão nova da aplicação, com "Actualizar" e "Agora não".',
		onde: 'Em todos os ecrãs, quando há mesmo versão nova.',
		anatomia: ['texto', 'botão principal', 'botão de adiar'],
		nota: '**Não há captura, e a razão interessa:** só aparece quando o *service worker* detecta uma versão nova no servidor, e em desenvolvimento não há service worker a correr. Forçá-lo dava uma captura de uma coisa que não é a mesma. Nem toda a actualização o faz aparecer — só as que mudam o número da versão, e foi isso que deixou de avisar toda a gente por nada.',
		estados: []
	},
	{
		id: 'C48',
		nome: 'Caixa de novidades',
		ficheiro: 'web/src/lib/CaixaNovidades.svelte',
		grupo: 'Sobreposições',
		oQueE: 'A caixa que mostra o que mudou desde a última vez que a pessoa abriu a aplicação.',
		onde: 'Em todos os ecrãs, uma vez por versão.',
		anatomia: ['cabeça com a versão', 'lista de pontos', 'palavras a negrito', 'fechar'],
		nota: 'Quem abre a aplicação pela primeira vez **não a vê**: mostrar uma lista de alterações a quem nunca viu a versão anterior não diz nada a ninguém.',
		estados: [
			{
				nome: 'Com novidades por ver',
				url: '/',
				seletor: '.caixa',
				chaves: { 'hoquei:versao-vista:v1': '1.6' },
				forcado: 'A chave que guarda a última versão vista foi posta em 1.6 — a versão de 19/10 — para a caixa ter o que mostrar.'
			}
		]
	},
	{
		id: 'C49',
		nome: 'Convite para instalar',
		ficheiro: 'web/src/lib/ConviteInstalar.svelte',
		grupo: 'Sobreposições',
		oQueE: 'O convite para guardar a aplicação no ecrã principal do telemóvel.',
		onde: 'Em todos os ecrãs, a quem ainda não a instalou.',
		anatomia: ['texto', 'instrução de partilhar', 'dispensar'],
		nota: 'Só aparece no iPhone e no iPad: no Android o sistema trata disto sozinho. E tem duas versões, porque numa vista embutida dentro de outra aplicação não há botão de instalar — aí o convite é para abrir no Safari.',
		estados: [
			{
				nome: 'Num iPhone, no Safari',
				url: '/',
				seletor: '.convite',
				chaves: { 'hoquei:convite-visto:v1': null },
				aparelho: 'iphone',
				forcado: 'O navegador da captura finge ser um iPhone no Safari — é o único aparelho a quem este convite aparece.'
			},
			{
				nome: 'Numa vista embutida',
				url: '/',
				seletor: '.convite',
				chaves: { 'hoquei:convite-visto:v1': null },
				aparelho: 'iphone-embutido',
				forcado: 'O mesmo iPhone, mas sem o sinal de que está no Safari — é assim que a aplicação vê uma vista embutida.'
			}
		]
	},
	{
		id: 'C50',
		nome: 'Transmissão em directo',
		ficheiro: 'web/src/lib/Directo.svelte',
		grupo: 'Sobreposições',
		oQueE: 'A caixa que mostra a transmissão de um jogo, dentro da própria ficha.',
		onde: 'Ficha de jogo, primeiro separador, nos jogos que têm câmara.',
		anatomia: ['moldura do vídeo', 'nota da fonte'],
		nota: '**Não há captura, e a lista estar vazia é o estado normal.** Cada transmissão só conta no dia do jogo, e a lista está escrita no código — não se força sem inventar um endereço. O que se vê hoje na lista de jogos é só a câmara vermelha na linha (parte do C09).',
		estados: []
	},
	{
		id: 'C51',
		nome: 'Faixa do site de testes',
		ficheiro: 'web/src/lib/SaidaDoRamo.svelte',
		grupo: 'Sobreposições',
		oQueE: 'O aviso de que isto não é o site a sério, com a saída para o site a sério.',
		onde: 'Só em testes.hoquei.pages.dev.',
		anatomia: ['faixa', 'endereço', 'ligação para produção'],
		nota: 'Existe por um engano: a 10/10/2026 o endereço de testes foi partilhado por engano. A faixa é para a próxima pessoa perceber onde está antes de o partilhar outra vez.',
		estados: [
			{
				nome: 'No site de testes',
				url: '/',
				seletor: '.folha, .cartao, .morada',
				base: TESTES,
				forcado: 'Capturado no site de testes a sério, e não no local: a faixa decide-se pelo endereço, e um `localhost` nunca a mostra. Essa é a única captura deste catálogo que não vem de produção.'
			}
		]
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
		onde: 'Por baixo das tabelas de Mérito e de classificação.',
		anatomia: ['título', 'conteúdo quando aberto'],
		estados: [
			{ nome: 'Fechada', url: MERITO, seletor: 'details.legenda' },
			{
				nome: 'Aberta',
				url: MERITO,
				seletor: 'details.legenda',
				prepara: async (pag) => {
					await pag.locator('details.legenda summary').first().click();
					await pag.waitForTimeout(400);
				}
			}
		]
	},
	{
		id: 'C40',
		nome: 'Estado vazio',
		ficheiro: 'web/src/routes/procurar/+page.svelte (.nada)',
		grupo: 'Texto e estados',
		oQueE: 'O que aparece quando não há nada para mostrar.',
		onde: 'Procura sem resultados.',
		anatomia: ['texto', 'acção quando há uma'],
		nota: 'Duas coisas verificadas e as duas mudam o que há para desenhar. O "dia sem jogos" **não se alcança a usar a app**: a fita de dias só oferece dias que têm jogos. E "O Meu Clube" sem equipas **não mostra um estado vazio** — mostra directamente a grelha de escolher clubes (C37), que é melhor desenho: convida em vez de informar.',
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
