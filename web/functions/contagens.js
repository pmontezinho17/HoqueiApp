/**
 * Ler as contagens: `/contagens?chave=…&dias=7`.
 *
 * **Fechado por omissão.** Sem a variável `CHAVE_CONTAGENS` configurada no projecto, ou com a
 * chave errada, isto responde 404 e não diz que existe. Não é segredo de estado — são
 * contagens agregadas —, mas um endereço que qualquer pessoa pode sondar convida a ser
 * sondado.
 *
 * **Duas consultas, não 8 por dia.** Em KV cada dia custava ~8 leituras e ver os últimos sete
 * eram ~60 idas; com `WHERE dia >= ?` são duas, independentemente de quantos dias se peçam.
 */

/** O dia em Lisboa, há `n` dias. A data de Lisboa é a que define "hoje" em todo o projecto. */
const diaDeLisboa = (hDeAtraso = 0) =>
	new Date(Date.now() - hDeAtraso * 86400000).toLocaleDateString('sv-SE', {
		timeZone: 'Europe/Lisbon'
	});

/** 1 em 10, como no `_middleware.js`. Repetido porque um ficheiro de Functions não importa
 *  do outro sem os compilar juntos, e dez linhas de `import` para um número não pagam. */
const AMOSTRA = 10;

/**
 * @param {{ request: Request, env: { DADOS?: import("@cloudflare/workers-types").D1Database, CHAVE_CONTAGENS?: string } }} contexto
 */
export async function onRequestGet({ request, env }) {
	const url = new URL(request.url);
	if (!env?.CHAVE_CONTAGENS || url.searchParams.get('chave') !== env.CHAVE_CONTAGENS) {
		return new Response('Não existe nada aqui.', { status: 404 });
	}
	if (!env.DADOS) {
		return new Response('A base de dados das contagens não está ligada a este projecto.', {
			status: 503
		});
	}

	const pedidos = Math.min(Math.max(Number(url.searchParams.get('dias')) || 7, 1), 30);
	const desde = diaDeLisboa(pedidos - 1);

	/** As duas formas de linha que as consultas devolvem. */
	const bd = /** @type {{ batch: (d: unknown[]) => Promise<[
	 *   { results: { dia: string, ecra: string, n: number }[] },
	 *   { results: { dia: string, total: number, novos: number }[] },
	 *   { results: { dia: string, tipo: string, n: number }[] }
	 * ]> }} */ (/** @type {unknown} */ (env.DADOS));
	const [visitas, aparelhos, tipos] = await bd.batch([
		env.DADOS.prepare('SELECT dia, ecra, n FROM visita WHERE dia >= ? ORDER BY dia').bind(desde),
		env.DADOS.prepare('SELECT dia, total, novos FROM aparelho WHERE dia >= ?').bind(desde),
		env.DADOS.prepare('SELECT dia, tipo, n FROM aparelho_tipo WHERE dia >= ?').bind(desde)
	]);

	/** @type {Record<string, Record<string, number>>} */
	const dias = {};
	for (const r of aparelhos.results ?? []) {
		(dias[r.dia] ??= {}).aparelhos = r.total;
		dias[r.dia].novos = r.novos;
	}
	// O tipo de aparelho, desde 21/10/2026. Vem como `ios`, `android`, `computador` e `outro` —
	// a soma dos quatro é, por construção, o total desse dia, porque entram na mesma `batch` que
	// o total. Se divergirem é porque uma escrita falhou, e isso é informação.
	for (const r of tipos.results ?? []) (dias[r.dia] ??= {})[r.tipo] = r.n;
	for (const r of visitas.results ?? []) {
		// `aberturas` é amostrado 1 em 10: o que se guarda é a amostra, o que se mostra é a
		// estimativa. Dizer "12" quando se contaram 12 de ~120 seria mentir por omissão.
		(dias[r.dia] ??= {})[r.ecra] = r.ecra === 'aberturas' ? r.n * AMOSTRA : r.n;
	}

	return new Response(
		JSON.stringify(
			{
				leia_se: {
					aparelhos:
						'quantos aparelhos distintos abriram a app nesse dia, e quantos o faziam ' +
						'pela primeira vez. Contagem exacta: cada aparelho avisa uma vez por dia, ' +
						'e é ele que decide, guardando uma data. Não há identificador, logo não se ' +
						'sabe se o aparelho de hoje é o mesmo de ontem.',
					aberturas:
						`estimativa, e **só até 13/10/2026**: pedidos de meta.json contados 1 em ` +
						`${AMOSTRA} e multiplicados. Acabou no dia em que o /v1/* saiu do caminho ` +
						'das Functions, para os pedidos de dados deixarem de gastar a quota diária ' +
						'da conta e de derrubar o site. Os dias seguintes não têm este ' +
						'número — têm `sessao`, que não é o mesmo e não se soma a este.',
					tipo_de_aparelho:
						'`ios`, `android`, `computador` e `outro` — quantos aparelhos de cada tipo ' +
						'abriram a app nesse dia. A soma dos quatro é o total desse dia, por ' +
						'construção: entram na mesma escrita. Sai do `User-Agent`, que é lido e ' +
						'deitado fora — a cadeia não se guarda, e não há identificador nenhum. ' +
						'**O iPad conta como computador**: desde o iPadOS 13 anuncia-se como ' +
						'Macintosh e o servidor não tem como distingui-los. Existe desde ' +
						'21/10/2026; os dias anteriores não têm este número.',
					sessao:
						'contagem exacta, a partir do dia em que esta alteração for publicada: '
						+ 'quantas vezes a app foi aberta ou ' +
						'retomada depois de meia hora parada. É o próprio aparelho que decide, ' +
						'com uma marca de tempo guardada nele — sem identificador, como o resto. ' +
						'Substitui o `aberturas` e tem uma definição que se diz numa frase, em vez ' +
						'de misturar uma app esquecida no bolso com alguém a usá-la.',
					ecras:
						'navegações que chegaram ao servidor. Dentro da app a navegação é do lado ' +
						'do cliente e não aparece aqui — isto conta sobretudo primeiras visitas, ' +
						'links partilhados e recarregamentos.'
				},
				dias: Object.fromEntries(Object.entries(dias).sort((a, b) => b[0].localeCompare(a[0])))
			},
			null,
			2
		),
		{ headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } }
	);
}
