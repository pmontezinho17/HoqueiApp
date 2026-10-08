/**
 * Ler as contagens: `/contagens?chave=…&dias=7`.
 *
 * **Fechado por omissão.** Sem a variável `CHAVE_CONTAGENS` configurada no projecto, ou com a
 * chave errada, isto responde 404 e não diz que existe. Não é segredo de estado — são
 * contagens agregadas —, mas um endereço que qualquer pessoa pode sondar convida a ser
 * sondado, e cada sondagem custa leituras do KV.
 *
 * Pede-se só os dias que interessam, em vez de listar tudo: cada dia são ~8 chaves, e listar
 * 120 dias para ver os últimos sete era gastar 960 leituras por consulta.
 */

/** Os últimos `n` dias, em datas de Lisboa, do mais recente para o mais antigo. */
function ultimosDias(n) {
	const hoje = new Date();
	const dias = [];
	for (let i = 0; i < n; i++) {
		const d = new Date(hoje.getTime() - i * 24 * 60 * 60 * 1000);
		dias.push(d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Lisbon' }));
	}
	return dias;
}

/** As mesmas chaves que o `_middleware.js` escreve. */
const CHAVES = [
	'aberturas',
	'/',
	'/clube',
	'/competicoes',
	'/equipa',
	'/jogo',
	'/mais',
	'/privacidade',
	'/procurar',
	'outro'
];

/** 1 em 10, como no `_middleware.js`. Repetido porque um ficheiro de Functions não importa
 *  do outro sem os compilar juntos, e dez linhas de `import` para um número não pagam. */
const AMOSTRA = 10;

export async function onRequestGet({ request, env }) {
	const url = new URL(request.url);
	if (!env?.CHAVE_CONTAGENS || url.searchParams.get('chave') !== env.CHAVE_CONTAGENS) {
		return new Response('Não existe nada aqui.', { status: 404 });
	}
	if (!env.CONTAGENS) {
		return new Response('O armazenamento das contagens não está ligado a este projecto.', {
			status: 503
		});
	}

	const pedidos = Math.min(Math.max(Number(url.searchParams.get('dias')) || 7, 1), 30);
	const saida = {};

	for (const dia of ultimosDias(pedidos)) {
		const linha = {};
		// aparelhos distintos: exacto, não amostrado — ver `functions/contar.js`
		const aparelhos = Number(await env.CONTAGENS.get(`d:${dia}`)) || 0;
		if (aparelhos) {
			linha.aparelhos = aparelhos;
			linha.novos = Number(await env.CONTAGENS.get(`n:${dia}`)) || 0;
		}
		for (const chave of CHAVES) {
			const n = Number(await env.CONTAGENS.get(`c:${dia}:${chave}`)) || 0;
			if (!n) continue;
			// `aberturas` é amostrado 1 em 10: o que se guarda é a amostra, o que se mostra é
			// a estimativa. Dizer "12" quando se contaram 12 de ~120 seria mentir por omissão.
			linha[chave] = chave === 'aberturas' ? n * AMOSTRA : n;
		}
		if (Object.keys(linha).length) saida[dia] = linha;
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
						`estimativa: pedidos de meta.json contados 1 em ${AMOSTRA} e multiplicados. ` +
						'É o sinal de app aberta, porque atravessa o service worker.',
					ecras:
						'navegações que chegaram ao servidor. Dentro da app a navegação é do lado ' +
						'do cliente e não aparece aqui — isto conta sobretudo primeiras visitas, ' +
						'links partilhados e recarregamentos.'
				},
				dias: saida
			},
			null,
			2
		),
		{ headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } }
	);
}
