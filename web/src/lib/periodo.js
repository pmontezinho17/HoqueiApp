/**
 * **O período que a consola mostra na vista de utilizadores.** Funções puras.
 *
 * Pedido do dono a 26/10/2026: *"neste momento só consigo ver o histórico de uma semana, mas
 * eu tenho dados de mais dias"*, com um filtro de datas e atalhos como "a última semana".
 *
 * Os sete dias vinham do observador, que os fixa no `/api`. **A série dos aparelhos passa a
 * ser lida aqui, da base de dados, para o período pedido**, e o observador continua a mandar
 * em tudo o resto. Não é uma segunda verdade nova: o `/contagens` já lia as mesmas tabelas do
 * mesmo sítio desde 13/10. E mudar o observador obrigava a publicá-lo à mão, com o dono de
 * férias e sem computador — e há um observador só, por isso nem o site de testes o via.
 *
 * Em `.js` e não `.ts` porque a Function da consola importa isto, e uma Function não importa
 * TypeScript — a mesma razão do `aparelho.js`.
 */

/** Os atalhos, pela ordem em que aparecem. `tudo` começa no primeiro dia com contador. */
export const ATALHOS = [
	{ id: '7', rotulo: '7 dias', dias: 7 },
	{ id: '30', rotulo: '30 dias', dias: 30 },
	{ id: 'tudo', rotulo: 'tudo', dias: null }
];

const DATA = /^\d{4}-\d{2}-\d{2}$/;

/** @param {string} dia @param {number} n */
export const somarDias = (dia, n) =>
	new Date(Date.parse(`${dia}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

/**
 * O período pedido no endereço, já arrumado.
 *
 * Aceita `?periodo=7|30|tudo` ou `?de=AAAA-MM-DD&ate=AAAA-MM-DD`. O que vier mal escrito cai
 * nos sete dias de sempre, porque é o que a consola mostrava e ninguém se perde. As datas
 * trocadas viram-se, e nada passa de hoje: um dia futuro não tem contagem e desenhá-lo vazio
 * diria "ninguém usou a app".
 *
 * @param {URLSearchParams} p
 * @param {string} hoje `AAAA-MM-DD` em Lisboa
 * @param {string | null} primeiro o primeiro dia com contador, ou `null` se ainda não houver
 * @returns {{ de: string, ate: string, atalho: string | null }}
 */
export function periodoPedido(p, hoje, primeiro) {
	let de = p.get('de');
	let ate = p.get('ate');
	if (de && DATA.test(de) && (!ate || DATA.test(ate))) {
		ate = ate && ate < hoje ? ate : hoje;
		if (de > ate) [de, ate] = [ate, de];
		return { de, ate, atalho: null };
	}
	const atalho = ATALHOS.find((a) => a.id === p.get('periodo')) ?? ATALHOS[0];
	const inicio = atalho.dias ? somarDias(hoje, 1 - atalho.dias) : (primeiro ?? hoje);
	return { de: inicio, ate: hoje, atalho: atalho.id };
}

/**
 * Os dias do período, do mais antigo para o mais recente.
 *
 * Com tecto: um `de` de há dez anos escrito à mão dava 3 650 linhas de nada. 400 cobre uma
 * época inteira com folga.
 *
 * @param {string} de @param {string} ate
 */
export function diasEntre(de, ate) {
	const dias = [];
	for (let d = de; d <= ate && dias.length < 400; d = somarDias(d, 1)) dias.push(d);
	return dias;
}

/**
 * O resumo do período, para o cartão por cima das barras.
 *
 * **"Entradas" e não "aparelhos".** Somar aparelhos distintos de cada dia dá quantas vezes um
 * aparelho entrou num dia, e não quantos aparelhos há: quem abre em cinco dias conta cinco. O
 * `novos` é o que mais se aproxima de "gente nova", porque cada aparelho só é novo uma vez.
 * A média e o pico contam só os dias com contador, pela mesma razão das barras: um dia sem
 * contador não é um dia com zero.
 *
 * @param {{ dia: string, aparelhos: number, novos: number }[]} serie
 * @param {Record<string, Record<string, number>>} [porDia] o tipo de aparelho, quando há
 */
export function resumoDoPeriodo(serie, porDia = {}) {
	const comDados = serie.filter((d) => d.aparelhos > 0);
	const entradas = comDados.reduce((t, d) => t + d.aparelhos, 0);
	const novos = comDados.reduce((t, d) => t + d.novos, 0);
	/** @type {{ dia: string, aparelhos: number } | null} */
	let pico = null;
	for (const d of comDados) if (!pico || d.aparelhos > pico.aparelhos) pico = d;
	/** @type {Record<string, number>} */
	const tipos = { ios: 0, android: 0, computador: 0, outro: 0 };
	let comTipo = 0;
	for (const d of serie) {
		const t = porDia[d.dia];
		if (!t || !Object.keys(tipos).some((k) => k in t)) continue;
		comTipo++;
		for (const k of Object.keys(tipos)) tipos[k] += t[k] ?? 0;
	}
	return {
		dias: comDados.length,
		entradas,
		novos,
		media: comDados.length ? Math.round(entradas / comDados.length) : 0,
		pico: pico ? { dia: pico.dia, aparelhos: pico.aparelhos } : null,
		tipos: comTipo ? tipos : null,
		diasComTipo: comTipo
	};
}
