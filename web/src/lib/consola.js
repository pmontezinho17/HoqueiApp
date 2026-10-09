/**
 * A consola, desenhada para um ecrã de PC.
 *
 * **Vive no `web/` e é servida pelo site**, em `hoquei.pages.dev/consola`, desde 09/10/2026.
 * Esteve no Worker observador até aí, e o endereço dele é `…torneiopa.workers.dev` — o
 * `torneiopa` é o subdomínio de uma aplicação anterior do dono, e a Cloudflare dá **um**
 * subdomínio `workers.dev` por conta, não um por projecto. Em vez de uma segunda conta — que
 * partia as ligações, porque elas são por conta — a página mudou de casa.
 *
 * Isto é só o desenho. Os dados chegam já prontos, do `/api` do observador, e esta função não
 * sabe de onde vieram: não fala com a base de dados nem com a GitHub. É essa separação que
 * faz com que a lógica de medição continue a ter um só dono.
 *
 * A primeira versão era uma coluna de 44 rem — a largura da app — e num monitor lia-se como
 * um telemóvel esticado. O dono cortou-a: *"quero uma visão de como se fosse a entrar num PC
 * normal"*. E a pergunta dele a seguir foi a que importa: *"onde está a informação de quem
 * usa a aplicação?"*. Estava lá, mas atrás de chaves técnicas — `/clube`, `/jogo` — e debaixo
 * de duas tabelas. Aqui é o primeiro bloco, com os nomes dos ecrãs por extenso.
 *
 * ## Decisões de desenho, e porquê
 *
 * **Números grandes em cima, barras para o uso, tabelas para os eventos.** Um número isolado
 * — "120 aberturas hoje" — não é um gráfico e não deve ser desenhado como um; uma série de
 * sete dias é, e é uma barra por dia. As tabelas ficam para o que é uma lista de
 * acontecimentos com hora: golos, corridas, rondas.
 *
 * **Uma série só, logo sem legenda.** As barras do uso são todas a mesma coisa — aberturas
 * por dia —, e o título diz o que são. Legenda de uma cor é ruído.
 *
 * **Duas cores de estado, e não três.** Verde e laranja. O amarelo entrou e saiu: medido com
 * o validador do `dataviz`, o par laranja/amarelo fica a ΔE 11 no tema escuro, e abaixo de 15
 * nem quem tem visão normal os distingue. O par que ficou passa as verificações nos dois
 * temas — o aviso de "lightness band" no escuro é a verificação pensada para séries
 * categóricas, e aqui o que manda é o contraste, que passa.
 *
 * **O estado nunca é só cor.** Tem palavra ao lado, sempre: "tudo em ordem", "algo está mal".
 * Quem não distingue as duas cores lê a frase.
 */

/**
 * A forma do que o `/api` do observador devolve.
 *
 * Escrita à mão e não gerada, porque é um **contrato entre dois sítios**: se o Worker mudar a
 * forma e isto não mudar, o `npm run check` grita aqui em vez de a consola aparecer vazia às
 * 22:00 de um sábado. É esse o trabalho que estes tipos fazem.
 *
 * @typedef {{ aparelhos?: number, novos?: number, aberturas?: number } & Record<string, number>} Entrada
 * @typedef {{ t: string, tipo: string, id?: number, de?: string, para?: string,
 *             situacao?: string, v?: number }} Evento
 * @typedef {{
 *   dia: string,
 *   dias: string[],
 *   estado: { saude?: { estado?: string, a_decorrer?: number, dados_com_minutos?: number,
 *                       jogos_hoje?: number, publicacao_velha?: boolean,
 *                       sem_resultado?: string[], ao_vivo_preso?: string[] },
 *             pedidos_fonte?: number, pedidos_falhados?: number } | null,
 *   rel: { cadencia_s: { mediana: number|null, minimo: number|null, maximo: number|null },
 *          buracos_acima_de_3min: string[], resultados: Evento[], erros: Evento[],
 *          publicacoes: number, eventos: number },
 *   runs: { nome: string, evento?: string, estado: string, quando?: string }[],
 *   diario: { ts?: string, contagens?: Record<string, number> }[],
 *   ent: Record<string, Entrada>,
 *   horas: Record<string, Record<string, number>>,
 *   porDia: Record<string, Record<string, number>>,
 *   sempre: { entradas: number, novos: number, dias: number } | null,
 *   entradasHora: Record<string, Record<string, { novos: number, volta: number }>>,
 *   chave?: string,
 *   vista?: string
 * }} Consola
 */

/** Os nomes dos ecrãs como uma pessoa lhes chama, e não como o endereço os escreve. */
/** @type {Record<string, string>} */
const ECRAS = {
	'/': 'Jogos do dia',
	'/clube': 'O Meu Clube',
	'/competicoes': 'Competições',
	'/equipa': 'Página de equipa',
	'/jogo': 'Ficha de jogo',
	'/mais': 'Sobre a app',
	'/privacidade': 'Privacidade',
	'/procurar': 'Procurar',
	'/ajuda': 'Perguntas frequentes',
	outro: 'Outros'
};

/** @param {unknown} x */
const esc = (x) =>
	String(x ?? '').replace(
		/[&<>"]/g,
		(c) => /** @type {Record<string, string>} */ ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]
	);

/** @param {string} d */
const diaCurto = (d) => {
	const dias = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
	const x = new Date(`${d}T12:00:00Z`);
	return `${dias[x.getUTCDay()]} ${d.slice(8)}/${d.slice(5, 7)}`;
};

/**
 * Os quatro tipos de pedido que a fonte serve, com a cor de cada um.
 *
 * Paleta categórica da referência do `dataviz`, validada com o `validate_palette.js` nos dois
 * temas: as quatro passam a banda de luminosidade, o piso de croma, a separação para
 * daltonismo (pior par ΔE 9,1 em protanopia) e o piso de visão normal (ΔE 22,9). No tema
 * claro duas delas ficam abaixo de 3:1 contra a superfície — e é por isso que o gráfico leva
 * **legenda com os valores e uma tabela de totais ao lado**, que é a compensação que o método
 * exige e não uma opção.
 *
 * A ordem é fixa: um tipo que desapareça num dia não faz os outros mudarem de cor.
 */
const TIPOS = [
	{ chave: 'competiciones', nome: 'lista de competições', claro: '#2a78d6', escuro: '#3987e5' },
	{ chave: 'calendario', nome: 'calendário de uma prova', claro: '#eb6834', escuro: '#d95926' },
	{ chave: 'clasificacion', nome: 'classificação de uma prova', claro: '#1baf7a', escuro: '#199e70' },
	{ chave: 'ficha', nome: 'ficha de um jogo', claro: '#eda100', escuro: '#c98500' }
];

/**
 * As 24 horas do dia, sempre as 24, em colunas.
 *
 * **Fixas e não só as que têm dados**, porque o dono pediu assim e tem razão: o que interessa
 * ver num gráfico destes é a *forma* do dia — onde estão os picos e onde está o silêncio — e
 * isso só se lê se as horas vazias ocuparem espaço.
 *
 * Empilhado, com 2 px de intervalo entre segmentos, que é o que os separa sem uma linha.
 */
/** @param {Record<string, Record<string, number>>} horas */
/**
 * Um tecto "redondo" acima do máximo, para o eixo ter números que se lêem.
 *
 * 80 pedidos numa hora dá um eixo até 100 e não até 80: um eixo que acaba exactamente no
 * máximo põe o rótulo de cima encavalitado na barra mais alta, e obriga a ler `83` quando o
 * que interessa é a ordem de grandeza.
 */
/** @param {number} maximo */
function tecto(maximo) {
	if (maximo <= 5) return 5;
	const escala = 10 ** Math.floor(Math.log10(maximo));
	for (const passo of [1, 2, 2.5, 5, 10]) {
		if (maximo <= passo * escala) return passo * escala;
	}
	return 10 * escala;
}

/** @param {Record<string, Record<string, number>>} horas */
function colunas(horas) {
	const totalDe = (/** @type {number} */ h) =>
		TIPOS.reduce((t, x) => t + (horas[h]?.[x.chave] ?? 0), 0);
	const maximo = Math.max(...Array.from({ length: 24 }, (_, h) => totalDe(h)), 0);
	// **O eixo é a escala, e não o máximo.** Com as barras medidas contra o máximo, uma hora
	// de 3 pedidos num dia de 3 enchia o gráfico — e lia-se como um pico. Contra um tecto
	// redondo, a altura passa a querer dizer sempre a mesma coisa.
	const alto = tecto(maximo);
	const agora = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Lisbon' }).slice(11, 13);

	const barras = Array.from({ length: 24 }, (_, h) => {
		const total = totalDe(h);
		const segmentos = TIPOS.filter((t) => (horas[h]?.[t.chave] ?? 0) > 0)
			.map((t) => {
				const n = horas[h][t.chave];
				return `<i class="s" style="height:${(100 * n) / total}%;background:var(--t-${t.chave})" title="${esc(t.nome)}: ${n}"></i>`;
			})
			.join('');
		const titulo = total
			? `${h}h: ${total} pedidos — ${TIPOS.filter((t) => horas[h]?.[t.chave])
					.map((t) => `${t.nome} ${horas[h][t.chave]}`)
					.join(', ')}`
			: `${h}h: nenhum pedido`;
		return `
    <div class="col${Number(agora) === h ? ' agora' : ''}" title="${esc(titulo)}">
      <span class="pilha" style="height:${total ? Math.max(1.5, (100 * total) / alto) : 0}%">${segmentos}</span>
      <span class="hh">${String(h).padStart(2, '0')}</span>
    </div>`;
	}).join('');

	// Quatro marcas e não mais: o eixo é para dar a ordem de grandeza, e cinco números numa
	// altura de 170 px começam a colidir.
	const marcas = [1, 0.75, 0.5, 0.25, 0]
		.map(
			(f) =>
				`<span class="marca" style="bottom:calc(${f * 100}% - .5em)">${Math.round(alto * f)}</span>`
		)
		.join('');
	const linhas = [1, 0.75, 0.5, 0.25]
		.map((f) => `<i style="bottom:${f * 100}%"></i>`)
		.join('');

	return {
		barras,
		marcas,
		linhas,
		maximo,
		alto,
		total: Array.from({ length: 24 }, (_, h) => totalDe(h)).reduce((x, y) => x + y, 0)
	};
}

/**
 * As entradas na app por hora, com quem é novo separado de quem volta.
 *
 * Pedido pelo dono a 09/10/2026: *"um gráfico de quando as pessoas entravam na aplicação por
 * hora... em cada barra podia estar a distinção entre o que é novo e o que não é"*.
 *
 * **Isto é a única medida exacta de gente que a consola tem.** As "aberturas" são uma
 * estimativa amostrada e contam actividade, não pessoas: uma app aberta duas horas pede o
 * `meta.json` 240 vezes. Aqui cada aparelho conta uma vez por dia, na hora em que entrou.
 *
 * **Um dia sem linhas não é um dia de zero entradas.** A tabela nasceu a 09/10/2026 às 19:15;
 * antes disso guardava-se o total do dia e não a hora. Quem desenha diz "não estávamos a
 * contar" em vez de desenhar vinte e quatro zeros.
 *
 * @param {Record<string, { novos: number, volta: number }>} horas
 */
function colunasEntradas(horas) {
	const totalDe = (/** @type {number} */ h) => (horas[h]?.novos ?? 0) + (horas[h]?.volta ?? 0);
	const alto = tecto(Math.max(...Array.from({ length: 24 }, (_, h) => totalDe(h)), 0));
	const agora = Number(
		new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Lisbon' }).slice(11, 13)
	);

	const barras = Array.from({ length: 24 }, (_, h) => {
		const n = horas[h]?.novos ?? 0;
		const v = horas[h]?.volta ?? 0;
		const total = n + v;
		// quem volta em baixo e os novos em cima: o crescimento é o que se quer ver destacado,
		// e o topo de uma coluna empilhada é onde o olho vai
		const segmentos =
			(v ? `<i class="s" style="height:${(100 * v) / total}%;background:var(--e-volta)" title="já cá tinham vindo: ${v}"></i>` : '') +
			(n ? `<i class="s" style="height:${(100 * n) / total}%;background:var(--e-novos)" title="primeira vez: ${n}"></i>` : '');
		const titulo = total
			? `${h}h: ${total} ${total === 1 ? 'entrada' : 'entradas'}${n ? ` — ${n} pela primeira vez` : ''}`
			: `${h}h: ninguém entrou`;
		return `
    <div class="col${agora === h ? ' agora' : ''}" title="${esc(titulo)}">
      <span class="pilha" style="height:${total ? Math.max(1.5, (100 * total) / alto) : 0}%">${segmentos}</span>
      <span class="hh">${String(h).padStart(2, '0')}</span>
    </div>`;
	}).join('');

	const marcas = [1, 0.5, 0]
		.map(
			(f) =>
				`<span class="marca" style="bottom:calc(${f * 100}% - .5em)">${Math.round(alto * f)}</span>`
		)
		.join('');
	return {
		barras,
		marcas,
		linhas: `<i style="bottom:100%"></i><i style="bottom:50%"></i>`,
		novos: Array.from({ length: 24 }, (_, h) => horas[h]?.novos ?? 0).reduce((x, y) => x + y, 0),
		volta: Array.from({ length: 24 }, (_, h) => horas[h]?.volta ?? 0).reduce((x, y) => x + y, 0),
		vazio: Object.keys(horas).length === 0
	};
}

/**
 * Os pedidos à fonte por dia, nos mesmos sete dias do resto da consola.
 *
 * O dono pediu para ver os dias anteriores no mesmo sítio. Estão aqui ao lado, e **cada dia é
 * um link** que troca o gráfico das 24 horas para esse dia — são os mesmos dados vistos de
 * duas distâncias, e nenhuma das duas custa um pedido à fonte.
 *
 * **Um dia sem linhas não é um dia de zero pedidos.** Pode ser anterior a este contador, que
 * nasceu a 08/10/2026. Esses levam travessão e nenhuma barra, como na série dos aparelhos.
 *
 * @param {string[]} dias
 * @param {Record<string, Record<string, number>>} porDia
 * @param {string} actual
 * @param {(dia: string) => string} ligar o construtor de endereços da própria consola
 */
function colunasPorDia(dias, porDia, actual, ligar) {
	const totalDe = (/** @type {string} */ d) =>
		TIPOS.reduce((t, x) => t + (porDia[d]?.[x.chave] ?? 0), 0);
	const alto = tecto(Math.max(...dias.map(totalDe), 0));

	const barras = dias
		.map((d) => {
			const total = totalDe(d);
			const semDados = !porDia[d];
			const segmentos = TIPOS.filter((t) => (porDia[d]?.[t.chave] ?? 0) > 0)
				.map(
					(t) =>
						`<i class="s" style="height:${(100 * porDia[d][t.chave]) / total}%;background:var(--t-${t.chave})" title="${esc(t.nome)}: ${porDia[d][t.chave]}"></i>`
				)
				.join('');
			return `
    <a class="col${d === actual ? ' agora' : ''}" href="${ligar(d)}"
       title="${esc(semDados ? `${d}: anterior a este contador` : `${d}: ${total} pedidos — ver as horas deste dia`)}">
      <span class="pilha" style="height:${total ? Math.max(1.5, (100 * total) / alto) : 0}%">${segmentos}</span>
      <span class="hh">${semDados ? '—' : total}</span>
      <span class="hh">${diaCurto(d)}</span>
    </a>`;
		})
		.join('');

	const marcas = [1, 0.5, 0]
		.map(
			(f) =>
				`<span class="marca" style="bottom:calc(${f * 100}% - .5em)">${Math.round(alto * f)}</span>`
		)
		.join('');
	return { barras, marcas, linhas: `<i style="bottom:100%"></i><i style="bottom:50%"></i>` };
}


/**
 * Um painel com **dois** números: o grande à esquerda e um segundo, menor, à direita.
 *
 * Pedido pelo dono a 09/10/2026 para o "pela primeira vez", que estava como nota de pé em
 * letra miúda. E ele tem razão no desenho: são duas medidas da mesma coisa, não uma medida e
 * um rodapé. A hierarquia fica no tamanho — 1,9 rem contra 1,25 rem — e não na posição.
 *
 * @param {string} etiqueta
 * @param {string|number} valor
 * @param {string|number} valor2
 * @param {string} nota2
 */
const painelDuplo = (etiqueta, valor, valor2, nota2) => `
<div class="painel">
  <span class="etiqueta">${esc(etiqueta)}</span>
  <div class="duplo">
    <strong>${esc(valor)}</strong>
    <span class="segundo"><b>${esc(valor2)}</b><em>${esc(nota2)}</em></span>
  </div>
</div>`;

/** Um número grande com a sua etiqueta. Não é um gráfico, e não se desenha como um. */
/**
 * @param {string} etiqueta
 * @param {string|number} valor
 * @param {string} [nota]
 * @param {string} [classe]
 */
const painel = (etiqueta, valor, nota = '', classe = '') => `
<div class="painel">
  <span class="etiqueta">${esc(etiqueta)}</span>
  <strong class="${classe}">${valor}</strong>
  ${nota ? `<span class="nota">${nota}</span>` : ''}
</div>`;

/**
 * As barras do uso: sete dias, e em cada um quem é novo separado de quem volta.
 *
 * Era uma série só e uma cor. Passou a empilhada a 09/10/2026 — os dados já lá estavam, na
 * coluna `novos` da tabela `aparelho`, e eram mostrados como um `+12` em letra pequena ao
 * lado do número. Separados, a barra responde à pergunta que o `+12` só sugeria: **isto está
 * a crescer ou são sempre os mesmos?**
 *
 * Rótulo em **todas** as barras e não em algumas, porque são sete valores e a barra é a
 * própria tabela — não há outro sítio onde ler o número.
 *
 * **Um dia sem contador não é um dia com zero.** O contador de aparelhos nasceu a 08/10/2026
 * e desenhar os dias anteriores como barras vazias dizia "ninguém usou a app" num dia em que
 * houve 150 aberturas. Esses aparecem sem barra e com um travessão.
 */
/** @param {{ dia: string, semDados: boolean, aparelhos: number, novos: number,
 *             aberturas: number, ecras: number }[]} dias */
function barras(dias) {
	const maximo = Math.max(1, ...dias.map((d) => d.aparelhos));
	return dias
		.map((d) => {
			const semContador = !d.aparelhos;
			const volta = Math.max(0, d.aparelhos - d.novos);
			const titulo = semContador
				? `${diaCurto(d.dia)}: o contador de aparelhos ainda não existia${
						d.aberturas ? ` — houve ~${d.aberturas} aberturas` : ''
					}`
				: `${diaCurto(d.dia)}: ${d.aparelhos} aparelhos — ${d.novos} pela primeira vez, ${volta} já cá tinham vindo`;
			const largura = (/** @type {number} */ n) => (100 * n) / maximo;
			return `
  <div class="barra" title="${esc(titulo)}">
    <span class="dia">${esc(diaCurto(d.dia))}</span>
    <span class="trilho">${
		semContador
			? ''
			: `<i style="width:${largura(volta)}%;background:var(--e-volta)"></i>` +
				`<i style="width:${largura(d.novos)}%;background:var(--e-novos)"></i>`
	}</span>
    <span class="valor">${
		semContador
			? '<em title="sem contador de aparelhos">—</em>'
			: `${d.aparelhos}${d.novos ? ` <em title="pela primeira vez">+${d.novos}</em>` : ''}`
	}</span>
  </div>`;
		})
		.join('');
}

/**
 * Um carimbo ISO em hora de Lisboa, curto: `09/10 00:41`.
 *
 * **As tabelas mostravam UTC e o resto da consola mostrava Lisboa.** O dono apanhou-o: viu
 * `10-08 23:41` no diário de rondas e não reconheceu a ronda das 00:30, que é exactamente
 * essa — `2026-10-08T23:41:03+00:00` é 00:41 do dia 9 em Lisboa. Uma hora errada numa consola
 * não é um detalhe de formatação: faz duvidar do que lá está.
 *
 * @param {string | undefined} iso
 */
const emLisboaCurto = (iso) => {
	if (!iso) return '';
	const t = Date.parse(iso);
	if (!Number.isFinite(t)) return '';
	const d = new Date(t).toLocaleString('sv-SE', { timeZone: 'Europe/Lisbon' });
	return `${d.slice(8, 10)}/${d.slice(5, 7)} ${d.slice(11, 16)}`;
};

/** Hoje, em Lisboa, que é o dia que manda em toda a consola. @param {string} d */
const ehHojeBase = (d) =>
	d === new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Lisbon' });

/** @param {Consola} dados */
export function pagina({
	dia,
	estado,
	rel,
	runs,
	diario,
	ent,
	dias,
	horas = {},
	porDia = {},
	sempre = null,
	entradasHora = {},
	chave,
	vista = 'utilizadores'
}) {
	// **Duas vistas, pedidas pelo dono a 09/10/2026**: *"podíamos ter esta visão separada por
	// visão de utilizadores e visão de sistema (chamadas/rondas)"*. São duas perguntas
	// diferentes — "quem usa isto?" e "a máquina está de pé?" — e misturá-las num ecrã só
	// obrigava a saltar por cima de metade para ler a outra metade.
	const sistema = vista === 'sistema';
	const entradas24 = colunasEntradas(entradasHora[dia] ?? {});
	/** Um endereço desta consola com uma coisa trocada. A chave viaja sempre. */
	const ligacao = (/** @type {Record<string,string>} */ troca) => {
		const p = new URLSearchParams();
		if (chave) p.set('chave', chave);
		if (!ehHojeBase(dia) || troca.dia) p.set('dia', troca.dia ?? dia);
		if (troca.dia) p.set('dia', troca.dia);
		const v = troca.vista ?? vista;
		if (v !== 'utilizadores') p.set('vista', v);
		return `?${p.toString()}`;
	};
	const s = estado?.saude;
	const graf = colunas(horas);
	// **O construtor de endereços é um só.** Este gráfico montava os seus links à mão, com o
	// dia e a chave, e esquecia-se da vista: clicar num dia na vista de sistema atirava para a
	// de utilizadores. O dono apanhou-o. Um segundo sítio a construir endereços é um sítio que
	// fica atrás do primeiro na próxima coisa que se acrescentar ao endereço.
	const diario7 = colunasPorDia(dias, porDia, dia, (d) => ligacao({ dia: d }));
	// o título diz "hoje" só quando é hoje: a consola abre-se noutros dias pelos links
	const ehHoje = ehHojeBase(dia);
	// **Os rótulos têm de dizer a verdade quando se vê outro dia.** "aparelhos hoje: 14" com
	// os 14 a serem de ontem é uma mentira pequena que faz tirar a conclusão errada depressa.
	const quando = ehHoje ? 'hoje' : 'nesse dia';
	/** @type {Record<string, number>} */
	const totaisPorTipo = {};
	for (const balde of Object.values(horas)) {
		for (const [k, n] of Object.entries(balde)) totaisPorTipo[k] = (totaisPorTipo[k] ?? 0) + n;
	}
	const mal = s?.estado === 'vermelho';
	const hoje = ent[dia] ?? {};
	// **Só o que é um ecrã**, e não "tudo o que não seja aberturas".
	//
	// A entrada de um dia traz ecrãs misturados com outras contagens — `aparelhos`, `novos`,
	// `aberturas` — e o filtro por exclusão deixava passar as novas: o dono viu "aparelhos 5"
	// e "novos 3" listados como se fossem ecrãs da app, e o total do painel vinha inflacionado
	// com eles. Um filtro por inclusão não tem esse problema quando se acrescentar a próxima.
	const ecrasHoje = Object.entries(hoje)
		.filter(([k]) => k in ECRAS)
		.sort((a, b) => b[1] - a[1]);
	const totalEcras = ecrasHoje.reduce((t, [, v]) => t + v, 0);

	const serie = dias.map((d) => ({
		dia: d,
		semDados: !ent[d],
		aparelhos: ent[d]?.aparelhos ?? 0,
		novos: ent[d]?.novos ?? 0,
		aberturas: ent[d]?.aberturas ?? 0,
		// por inclusão, como em `ecrasHoje`: por exclusão somavam-se `aparelhos` e `novos`
		ecras: Object.entries(ent[d] ?? {})
			.filter(([k]) => k in ECRAS)
			.reduce((t, [, v]) => t + v, 0)
	}));
	const comDados = serie.filter((d) => d.aparelhos > 0);
	const semana = comDados.reduce((t, d) => t + d.aparelhos, 0);

	/**
	 * @param {string[]} linhas
	 * @param {string} [vazio]
	 */
	const tabela = (linhas, vazio = 'nada ainda') =>
		linhas.length
			? `<table>${linhas.join('')}</table>`
			: `<p class="vazio">${vazio}</p>`;

	return `<!doctype html>
<html lang="pt-PT"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Consola — OK4Sticks</title>
<meta http-equiv="refresh" content="60">
<style>
 /* Os tokens claros são a base; o escuro redefine-os. **Três sítios e não um**, de
    propósito: o media serve quem nunca escolheu, e o atributo serve quem escolheu — nos dois
    sentidos, porque escolher "claro" num sistema escuro tem de funcionar tanto como o
    contrário. É o mesmo desenho do tema da app, em lib/tema.svelte.ts. */
 :root {
   color-scheme: light;
   --fundo:#f5f6f8; --cartao:#fff; --texto:#14171c; --texto2:#4b525c; --suave:#767e8a;
   --borda:#e3e6ea; --borda2:#eef0f3;
   --bem:#0a7d54; --mal:#c2410c; --barra:#0a7d54;
   --t-competiciones:#2a78d6; --t-calendario:#eb6834; --t-clasificacion:#1baf7a;
   --t-ficha:#eda100;
   /* quem volta em tom calmo, quem é novo em destaque: o crescimento é o que se quer ver */
   --e-volta:#9fb3c8; --e-novos:#0a7d54;
 }
 @media (prefers-color-scheme: dark) {
   :root:not([data-tema="claro"]) { color-scheme: dark;
     --fundo:#0f1115; --cartao:#181b21; --texto:#e8eaed; --texto2:#b6bcc5; --suave:#868d98;
     --borda:#272b33; --borda2:#1f232a;
     --bem:#34d399; --mal:#fb923c; --barra:#34d399;
     /* os mesmos quatro tons, re-escalados para a superfície escura e validados contra ela —
        não é uma inversão automática */
     --t-competiciones:#3987e5; --t-calendario:#d95926; --t-clasificacion:#199e70;
     --t-ficha:#c98500;
     --e-volta:#53657a; --e-novos:#34d399;
   }
 }
 :root[data-tema="escuro"] { color-scheme: dark;
   --fundo:#0f1115; --cartao:#181b21; --texto:#e8eaed; --texto2:#b6bcc5; --suave:#868d98;
   --borda:#272b33; --borda2:#1f232a;
   --bem:#34d399; --mal:#fb923c; --barra:#34d399;
   --t-competiciones:#3987e5; --t-calendario:#d95926; --t-clasificacion:#199e70;
   --t-ficha:#c98500;
   --e-volta:#53657a; --e-novos:#34d399;
 }
 * { box-sizing:border-box }
 body { margin:0; background:var(--fundo); color:var(--texto);
   font:14px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; padding:24px 28px 56px }
 header { display:flex; align-items:baseline; gap:12px; margin-bottom:12px; flex-wrap:wrap }

 /* A barra de filtros. Links e não JavaScript: o meta refresh recarrega o endereço actual,
    logo a escolha sobrevive à actualização de 60 em 60 s sem estado nenhum. */
 .filtros { display:flex; align-items:center; gap:8px; flex-wrap:wrap;
   max-width:1760px; margin:0 auto 16px }
 .grupo { display:flex; background:var(--cartao); border:1px solid var(--borda);
   border-radius:9px; padding:2px; gap:2px }
 .grupo a, .grupo button { padding:5px 11px; font:inherit; font-size:.76rem; color:var(--texto2);
   text-decoration:none; border:0; background:none; border-radius:7px; cursor:pointer;
   white-space:nowrap }
 .grupo a:hover, .grupo button:hover { color:var(--texto); background:var(--borda2) }
 .grupo a[aria-current], .grupo button[aria-pressed="true"] { background:var(--borda2);
   color:var(--texto); font-weight:600 }
 .filtros .espaco { flex:1 }
 h1 { font-size:1.1rem; margin:0; letter-spacing:-.01em }
 header .meta { color:var(--suave); font-size:.8rem }
 /* **Enche a janela, e centra-se quando ela é grande.** Estava travada em 1280 px e num
    monitor de 1900 ficava tudo encostado à esquerda com meio ecrã vazio — o dono apanhou-o.
    O tecto existe à mesma porque uma tabela de 2500 px de largura obriga a varrer a cabeça
    de um lado ao outro para ler uma linha. */
 .grelha { display:grid; gap:16px; grid-template-columns:repeat(12,1fr);
   max-width:1760px; margin-inline:auto }
 section { background:var(--cartao); border:1px solid var(--borda); border-radius:12px;
   padding:16px 18px; min-width:0 }
 section > h2 { font-size:.7rem; letter-spacing:.07em; text-transform:uppercase;
   color:var(--suave); margin:0 0 12px; font-weight:600 }
 .l12 { grid-column:span 12 } .l8 { grid-column:span 8 } .l6 { grid-column:span 6 }
 .l4 { grid-column:span 4 } .l3 { grid-column:span 3 }
 @media (max-width:1000px) { .l8,.l6,.l4,.l3 { grid-column:span 12 } body { padding:16px } }

 /* o estado: cor **e** palavra, nunca só cor */
 .estado { display:flex; align-items:center; gap:16px; flex-wrap:wrap }
 .farol { width:12px; height:12px; border-radius:50%; flex:0 0 auto;
   background:${mal ? 'var(--mal)' : 'var(--bem)'} }
 .estado b { font-size:1.25rem; letter-spacing:-.01em }
 .estado .porque { color:var(--texto2); font-size:.85rem }
 .estado .porque span { color:var(--mal); font-weight:600 }

 .paineis { display:grid; grid-template-columns:repeat(6,1fr); gap:16px }
 @media (max-width:1400px) { .paineis { grid-template-columns:repeat(3,1fr) } }
 @media (max-width:760px) { .paineis { grid-template-columns:repeat(2,1fr) } }
 .painel { background:var(--cartao); border:1px solid var(--borda); border-radius:12px;
   padding:14px 16px; display:flex; flex-direction:column; gap:2px }
 .painel .etiqueta { font-size:.68rem; letter-spacing:.06em; text-transform:uppercase;
   color:var(--suave); font-weight:600 }
 .painel strong { font-size:1.9rem; font-variant-numeric:tabular-nums; letter-spacing:-.02em;
   line-height:1.15 }
 .painel strong.mal { color:var(--mal) }
 .painel .nota { font-size:.74rem; color:var(--suave) }

 /* dois números no mesmo painel: alinhados pela **base** e não pelo topo, que é o que os faz
    ler como uma linha só apesar dos tamanhos diferentes */
 .painel .duplo { display:flex; align-items:baseline; justify-content:space-between; gap:12px }
 .painel .segundo { text-align:right; line-height:1.15 }
 .painel .segundo b { font-size:1.25rem; font-variant-numeric:tabular-nums;
   letter-spacing:-.01em; color:var(--texto2) }
 .painel .segundo em { display:block; font-style:normal; font-size:.68rem; color:var(--suave) }

 /* uso: uma série, uma cor, extremo arredondado, rótulo directo */
 .barra { display:grid; grid-template-columns:5.5rem 1fr 3.2rem; align-items:center; gap:10px;
   padding:3px 0 }
 .barra .dia { font-size:.78rem; color:var(--texto2) }
 .barra .trilho { background:var(--borda2); border-radius:4px; height:14px; overflow:hidden;
   display:flex }
 .barra .trilho i { display:block; height:100%; min-width:0 }
 .barra .valor { font-size:.8rem; font-variant-numeric:tabular-nums; text-align:right;
   color:var(--texto2) }
 .barra .valor em { color:var(--suave); font-style:normal }
 .barra:hover .dia { color:var(--texto) }

 /* gráfico de colunas: 24 horas fixas, empilhadas por tipo, agora com eixo vertical.
    O dono pediu-o: *"tenho sempre de passar o rato por cima para perceber qual o número"* —
    e um gráfico que só se lê com o rato não se lê num telefone nem numa impressão. */
 .comEixo { display:grid; grid-template-columns:2.6rem 1fr; gap:6px; margin:6px 0 0 }
 .eixo { position:relative; height:170px }
 .eixo .marca { position:absolute; right:0; font-size:.66rem; color:var(--suave);
   font-variant-numeric:tabular-nums }
 .area { position:relative }
 /* as guias ficam **atrás** das barras e não por cima: uma linha a cortar uma coluna lê-se
    como uma divisão da coluna, que é outra coisa */
 .guias { position:absolute; inset:0 0 18px 0; pointer-events:none }
 .guias i { position:absolute; left:0; right:0; height:1px; background:var(--borda2) }
 .grafico { display:flex; align-items:flex-end; gap:3px; height:170px; margin:0;
   position:relative }
 .col { flex:1; display:flex; flex-direction:column; justify-content:flex-end; align-items:center;
   height:100%; gap:4px; min-width:0 }
 .col .pilha { width:100%; display:flex; flex-direction:column-reverse; gap:2px;
   border-radius:4px 4px 0 0; overflow:hidden }
 .col .pilha i.s { display:block; width:100%; min-height:2px }
 .col .hh { font-size:.62rem; color:var(--suave); font-variant-numeric:tabular-nums }
 .col.agora .hh { color:var(--texto); font-weight:700 }
 .col:hover .pilha { outline:2px solid var(--borda); outline-offset:1px }

 /* O gráfico dos dias: colunas mais largas, com o total escrito, e cada uma é um link.

    **Nem o dia escolhido nem o hover pintam a coluna toda.** Era o que estava, e um fundo
    cinzento de 170 px de altura atrás de uma barra de 20 lê-se como uma segunda barra — o
    gráfico passava a ter duas alturas a dizer coisas diferentes. O realce vive no rótulo e no
    contorno da barra, como no gráfico das horas ao lado. */
 .grafico.dias { gap:8px }
 .grafico.dias .col { text-decoration:none; color:inherit }
 .grafico.dias .col:hover .pilha { outline:2px solid var(--borda); outline-offset:1px }
 .grafico.dias .col .hh:first-of-type { font-weight:600; color:var(--texto2) }
 .grafico.dias .col.agora .hh { color:var(--texto) }
 .grafico.dias .col.agora .hh:last-child { font-weight:700;
   box-shadow:inset 0 -2px 0 var(--texto2) }
 .legenda { display:flex; flex-wrap:wrap; gap:4px 16px; margin-top:12px; font-size:.78rem }
 .legenda span { display:inline-flex; align-items:center; gap:6px; color:var(--texto2) }
 .legenda i { width:10px; height:10px; border-radius:3px; flex:0 0 auto }
 .legenda b { font-variant-numeric:tabular-nums; color:var(--texto) }
 /* o total do dia na própria legenda, em vez de uma frase por baixo — pedido do dono */
 .legenda .total { color:var(--texto); font-weight:600; padding-right:4px;
   border-right:1px solid var(--borda); margin-right:4px }
 .legenda .total b { font-size:1rem }

 /* **Scroll em vez de crescer sem fim.** O dono gosta do tamanho actual das tabelas de
    registos e quer que elas o mantenham: uma lista de corridas de um sábado com 36 jogos
    seria dezenas de linhas a empurrar tudo o que está por baixo. */
 .rolar { max-height:17rem; overflow-y:auto; margin:-2px -4px 0; padding:2px 4px 0 }
 .rolar::-webkit-scrollbar { width:8px }
 .rolar::-webkit-scrollbar-thumb { background:var(--borda); border-radius:4px }

 /* os textos de rodapé de cada bloco: uma linha ou duas, não um parágrafo */
 section > p.vazio { margin:8px 0 0; font-size:.74rem; line-height:1.5; max-width:62ch }

 table { width:100%; border-collapse:collapse }
 th,td { text-align:left; padding:6px 0; font-weight:400; vertical-align:top; font-size:.84rem }
 th { color:var(--suave); white-space:nowrap; padding-right:14px; width:1%; font-variant-numeric:tabular-nums }
 tr+tr th, tr+tr td { border-top:1px solid var(--borda2) }
 td.n, .n { font-variant-numeric:tabular-nums }
 .bem { color:var(--bem) } .pior { color:var(--mal) }
 .vazio { color:var(--suave); font-size:.84rem; margin:0 }
 code { background:var(--borda2); padding:1px 5px; border-radius:4px; font-size:.9em }
</style></head><body>

<header>
  <h1>Consola OK4Sticks</h1>
  <span class="meta">${
		ehHoje
			? 'actualiza-se a cada 60 s'
			: `a ver <b>${esc(dia)}</b> — o farol e os «pedidos agora» são deste momento`
	}</span>
</header>

<nav class="filtros">
  <div class="grupo">
    <a href="${ligacao({ vista: 'utilizadores' })}" ${!sistema ? 'aria-current="page"' : ''}>utilizadores</a>
    <a href="${ligacao({ vista: 'sistema' })}" ${sistema ? 'aria-current="page"' : ''}>sistema</a>
  </div>
  <div class="grupo">
    ${dias
		.map(
			(d) =>
				`<a href="${ligacao({ dia: d })}" ${d === dia ? 'aria-current="page"' : ''}
				   title="${esc(d)}">${esc(ehHojeBase(d) ? 'hoje' : diaCurto(d))}</a>`
		)
		.join('')}
  </div>
  <span class="espaco"></span>
  <div class="grupo" id="tema">
    <button type="button" data-tema="sistema">sistema</button>
    <button type="button" data-tema="claro">claro</button>
    <button type="button" data-tema="escuro">escuro</button>
  </div>
</nav>

<div class="grelha">

  <section class="l12">
    <div class="estado">
      <span class="farol"></span>
      <b>${s ? (mal ? 'algo está mal' : 'tudo em ordem') : 'sem leitura ainda'}</b>
      <span class="porque">
        ${
			s
				? [
						`${s.jogos_hoje} jogos hoje`,
						`${s.a_decorrer} na janela`,
						`dados de há ${s.dados_com_minutos ?? '?'} min`,
						s.sem_resultado?.length
							? `<span>${s.sem_resultado.length} sem resultado há mais de 2 h</span>`
							: null,
						s.ao_vivo_preso?.length ? `<span>"ao vivo" preso em ${s.ao_vivo_preso.length}</span>` : null,
						s.publicacao_velha ? '<span>publicação parada com jogos a decorrer</span>' : null
					]
						.filter(Boolean)
						.join(' · ')
				: 'o cron corre nas horas de jogos — ou força com /observar'
		}
      </span>
    </div>
  </section>

  <div class="l12 paineis">
    ${
		sistema
			? [
					painel(
						'pedidos à APL, agora',
						estado?.pedidos_fonte ?? '—',
						estado?.pedidos_falhados
							? `<span class="pior">${estado.pedidos_falhados} falhados</span>`
							: 'na última ronda',
						estado?.pedidos_falhados ? 'mal' : ''
					),
					painel(
						'cadência',
						rel.cadencia_s.mediana != null ? `${rel.cadencia_s.mediana}s` : '—',
						rel.buracos_acima_de_3min.length
							? `<span class="pior">${rel.buracos_acima_de_3min.length} buraco(s) > 3 min</span>`
							: 'entre publicações, mediana',
						rel.buracos_acima_de_3min.length ? 'mal' : ''
					),
					painel('publicações', rel.publicacoes, `${rel.eventos} eventos observados`),
					painel('pedidos à APL', graf.total, `no dia ${esc(dia)}`)
				].join('\n')
			: [
					hoje.aparelhos
						? painelDuplo(
								`entradas ${quando}`,
								hoje.aparelhos,
								hoje.novos ?? 0,
								'pela primeira vez'
							)
						: painel(`entradas ${quando}`, '—', 'um aparelho conta uma vez por dia'),
					painel(
						'entradas desde sempre',
						sempre?.entradas ?? '—',
						sempre
							? `${sempre.novos} primeiras vezes, em ${sempre.dias} ${sempre.dias === 1 ? 'dia' : 'dias'}`
							: 'ainda sem histórico'
					),
					painel(
						`actividade ${quando}`,
						hoje.aberturas ? `~${hoje.aberturas}` : '0',
						'pedidos de dados, não pessoas'
					),
					painel(
						`ecrãs abertos ${quando}`,
						totalEcras,
						`${ecrasHoje.length} ${ecrasHoje.length === 1 ? 'ecrã diferente' : 'ecrãs diferentes'}`
					)
				].join('\n')
	}
  </div>

  ${
		sistema
			? `
  <section class="l8">
    <h2>pedidos à APL por hora — ${esc(ehHoje ? 'hoje' : dia)}</h2>
    <div class="comEixo">
      <div class="eixo">${graf.marcas}</div>
      <div class="area">
        <div class="guias">${graf.linhas}</div>
        <div class="grafico">${graf.barras}</div>
      </div>
    </div>
    <div class="legenda">
      <span class="total"><b>${graf.total}</b> no total</span>
      ${TIPOS.map(
			(t) =>
				`<span><i style="background:var(--t-${t.chave})"></i>${esc(t.nome)} <b>${
					totaisPorTipo[t.chave] ?? 0
				}</b></span>`
		).join('')}
    </div>
    <p class="vazio">
      ${graf.total ? `Pico de ${graf.maximo} numa hora.` : 'Nada registado neste dia.'}
      Retentativas incluídas. <strong>Só conta as rondas que publicaram</strong> — ver o backlog.
    </p>
  </section>

  <section class="l4">
    <h2>e nos dias anteriores</h2>
    <div class="comEixo">
      <div class="eixo">${diario7.marcas}</div>
      <div class="area">
        <div class="guias">${diario7.linhas}</div>
        <div class="grafico dias">${diario7.barras}</div>
      </div>
    </div>
    <p class="vazio">Cada dia é um link. Travessão = anterior a este contador.</p>
  </section>

  <section class="l6">
    <h2>golos ${quando === 'hoje' ? 'de hoje' : `de ${dia}`}, à hora a que apareceram</h2>
    ${tabela(
		rel.resultados.map(
			(r) =>
				`<tr><th>${esc(r.t)}</th><td>#${esc(r.id)} <span class="n">${esc(r.de)}</span> → <b class="n">${esc(r.para)}</b> <span class="vazio">${esc(r.situacao ?? '')}</span></td></tr>`
		),
		`nenhum golo observado ${quando}`
	)}
  </section>

  <section class="l6">
    <h2>a cadeia — últimas corridas</h2>
    <div class="rolar">
    ${tabela(
		runs.map(
			(r) =>
				`<tr><th>${esc(emLisboaCurto(r.quando))}</th><td>${esc(r.nome)}
         <span class="${r.estado === 'success' ? 'bem' : r.estado === 'failure' ? 'pior' : 'vazio'}">${esc(r.estado)}</span>
         <span class="vazio">${esc(r.evento ?? '')}</span></td></tr>`
		),
		'sem corridas'
	)}
    </div>
  </section>

  <section class="l12">
    <h2>o que cada ronda produziu</h2>
    <div class="rolar">
    ${tabela(
		diario
			.slice()
			.reverse()
			.map(
				(r) =>
					`<tr><th>${esc(emLisboaCurto(r.ts))}</th><td class="n">${esc(r.contagens?.jogos)} jogos · ${esc(r.contagens?.jogos_disputados)} disputados · ${esc(r.contagens?.fichas)} fichas · ${esc(r.contagens?.linhas_classificacao)} linhas de tabela · ${esc(r.contagens?.feeds_ics)} feeds</td></tr>`
			),
		'sem rondas registadas'
	)}
    </div>
  </section>`
			: `
  <section class="l8">
    <h2>entradas por hora — ${esc(ehHoje ? 'hoje' : dia)}</h2>
    ${
		entradas24.vazio
			? `<p class="vazio">Não há horas registadas neste dia. Este contador nasceu a
			   09/10/2026 às 19:15 — antes disso guardava-se o total do dia e não a hora.</p>`
			: `<div class="comEixo">
      <div class="eixo">${entradas24.marcas}</div>
      <div class="area">
        <div class="guias">${entradas24.linhas}</div>
        <div class="grafico">${entradas24.barras}</div>
      </div>
    </div>
    <div class="legenda">
      <span class="total"><b>${entradas24.novos + entradas24.volta}</b> entradas</span>
      <span><i style="background:var(--e-novos)"></i>pela primeira vez <b>${entradas24.novos}</b></span>
      <span><i style="background:var(--e-volta)"></i>já cá tinham vindo <b>${entradas24.volta}</b></span>
    </div>
    <p class="vazio">Cada aparelho conta uma vez por dia, na hora em que entrou. É a única
      medida exacta de gente que esta consola tem.</p>`
	}
  </section>

  <section class="l4">
    <h2>que ecrãs abriram ${quando}</h2>
    <div class="rolar">
    ${tabela(
		ecrasHoje.map(
			([k, v]) =>
				`<tr><td>${esc(ECRAS[k] ?? k)}</td><th class="n" style="text-align:right">${esc(v)}</th></tr>`
		),
		`ninguém abriu nada ${quando}`
	)}
    </div>
    <p class="vazio">Navegações que chegaram ao servidor: primeiras visitas, links partilhados
      e recarregamentos. Dentro da app a navegação não toca na rede.</p>
  </section>

  <section class="l12">
    <h2>quem usa a aplicação — aparelhos distintos por dia</h2>
    ${barras(serie)}
    <div class="legenda">
      <span><i style="background:var(--e-novos)"></i>pela primeira vez</span>
      <span><i style="background:var(--e-volta)"></i>já cá tinham vindo</span>
    </div>
    <p class="vazio">
      ${semana} ${semana === 1 ? 'aparelho' : 'aparelhos'} em ${comDados.length}
      ${comDados.length === 1 ? 'dia' : 'dias'}. São aparelhos e não pessoas — telemóvel e PC
      da mesma pessoa contam dois — e não há identificador nenhum, logo não dá para saber se o
      aparelho de hoje é o mesmo de ontem.${
			serie.length > comDados.length ? ' Travessão = anterior a este contador.' : ''
		}
    </p>
  </section>`
	}
</div>

<script>
 // O tema, guardado neste browser. Sem isto, a consola seguia só o sistema — e quem quer o
 // escuro num PC claro não tinha como.
 (function () {
   var C = 'ok4sticks:consola:tema';
   function pintar(v) {
     if (v === 'sistema') document.documentElement.removeAttribute('data-tema');
     else document.documentElement.setAttribute('data-tema', v);
     var bs = document.querySelectorAll('#tema button');
     for (var i = 0; i < bs.length; i++) {
       bs[i].setAttribute('aria-pressed', String(bs[i].dataset.tema === v));
     }
   }
   var guardado = 'sistema';
   try { guardado = localStorage.getItem(C) || 'sistema'; } catch (e) {}
   pintar(guardado);
   document.getElementById('tema').addEventListener('click', function (e) {
     var v = e.target && e.target.dataset && e.target.dataset.tema;
     if (!v) return;
     // 'sistema' nao se guarda: a ausencia da chave e a omissao, como na app
     try { v === 'sistema' ? localStorage.removeItem(C) : localStorage.setItem(C, v); } catch (err) {}
     pintar(v);
   });
 })();
</script>
</body></html>`;
}
