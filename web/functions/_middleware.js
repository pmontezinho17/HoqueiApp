/**
 * Contar quantas pessoas abrem a app, e que ecrãs usam, **do lado do servidor** (P11.5).
 *
 * Isto corre na Cloudflare, não no telemóvel. É a diferença toda: não há script no cliente,
 * não há cookie, não há pedido a terceiros, e a `/privacidade` continua a poder dizer isso.
 * A alternativa que o painel da Cloudflare oferece — a Web Analytics — é um *beacon* servido
 * de `static.cloudflareinsights.com`, ou seja código de terceiros a carregar no telemóvel de
 * quem usa a app, e isso era quebrar a promessa dessa página.
 *
 * **O que é guardado:** um contador por dia e por tipo de ecrã. Nada mais. Sem IP, sem
 * identificador, sem sessão, sem nada que ligue duas visitas uma à outra. Se a mesma pessoa
 * abrir o `/clube` cinco vezes, o contador diz 5 e não sabe que foi a mesma pessoa.
 *
 * **Os caminhos são agregados de propósito.** `/equipa/sub-13/parede-fc-a` conta como
 * `/equipa`. Uma lista de equipas espiadas é mais informação do que a pergunta pede — "que
 * ecrãs se usam?" — e, sem agregar, as chaves explodiam com 86 equipas e 800 jogos.
 *
 * ## Porque se contam duas coisas e não uma
 *
 * Contar navegações parecia suficiente e não é, e isto foi medido a 06/10/2026: o nosso
 * *service worker* registra um `NavigationRoute` ligado a `/`, por isso **uma navegação de
 * quem já visitou a app nunca chega ao servidor** — vem da cache do próprio telemóvel. E
 * dentro da app a navegação é toda do lado do cliente, que também não toca na rede. Um
 * contador de navegações mediria visitantes novos, não utilização.
 *
 * O que **chega sempre** ao servidor é o `meta.json`: é `NetworkFirst`, com 3 s de espera, e
 * é pedido a cada abertura e a cada ronda de actualização. É esse o sinal de "há alguém com
 * a app aberta".
 *
 * ## O tecto que obriga a amostragem
 *
 * O KV gratuito dá **1 000 escritas por dia**, e numa janela de jogos 20 telemóveis abertos
 * duas horas fazem ~4 800 pedidos de `meta.json` — uma escrita por pedido estourava o tecto
 * e a contagem parava a meio da tarde. Por isso o `meta.json` conta-se **1 em 10**, e o
 * número devolvido é uma estimativa (×10). As navegações, que são poucas, contam-se todas.
 *
 * **A contagem nunca atrasa nem parte a página.** Vai toda dentro de `waitUntil` e de um
 * `try`, e sem a ligação ao KV este ficheiro é um `next()` e mais nada — é isso que permite
 * publicar antes de o KV existir.
 */

/** 1 em quantos pedidos de dados se contam. Ver "o tecto que obriga a amostragem". */
export const AMOSTRA = 10;

/** O dia em Lisboa, e não em UTC. Já nos custou bugs: à meia-noite e meia de Lisboa o UTC
 *  ainda está no dia anterior, e as contagens de uma jornada nocturna caíam no dia errado. */
const diaDeLisboa = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Lisbon' });

const ECRAS = ['/equipa', '/jogo', '/competicoes', '/clube', '/mais', '/privacidade', '/procurar'];

/**
 * O tipo de ecrã, com os segmentos variáveis descartados.
 * @param {string} caminho
 * @returns {string}
 */
export function ecraDe(caminho) {
	if (caminho === '/' || caminho === '/index.html') return '/';
	const limpo = caminho.replace(/\.html$/, '').replace(/\/+$/, '');
	for (const base of ECRAS) {
		if (limpo === base || limpo.startsWith(`${base}/`)) return base;
	}
	return 'outro';
}

/**
 * O que é que este pedido conta, se contar algo.
 *
 * `null` é o caso normal: um ficheiro de dados qualquer, um emblema, um pedido que não diz
 * nada sobre utilização.
 *
 * @param {Request} pedido
 * @param {() => number} [sorteio] injectável só para o teste poder fixar a amostragem
 * @returns {string | null}
 */
export function oQueContar(pedido, sorteio = Math.random) {
	if (pedido.method !== 'GET') return null;
	const caminho = new URL(pedido.url).pathname;

	// o sinal de "alguém tem a app aberta": não depende do service worker, mas é frequente
	if (/^\/v1\/[^/]+\/[^/]+\/meta\.json$/.test(caminho)) {
		return sorteio() < 1 / AMOSTRA ? 'aberturas' : null;
	}

	// uma pessoa a abrir um ecrã de fora da app — primeira visita, link partilhado, recarregar
	const navegacao =
		pedido.headers.get('Sec-Fetch-Mode') === 'navigate' ||
		(pedido.headers.get('Accept') ?? '').includes('text/html');
	if (navegacao && !caminho.startsWith('/v1/')) return ecraDe(caminho);

	return null;
}

/**
 * @param {{
 *   request: Request,
 *   env: {
 *     CONTAGENS?: {
 *       get(chave: string): Promise<string | null>,
 *       put(chave: string, valor: string, opcoes?: { expirationTtl?: number }): Promise<void>
 *     }
 *   },
 *   next: () => Promise<Response>,
 *   waitUntil: (promessa: Promise<unknown>) => void
 * }} contexto
 */
export async function onRequest(contexto) {
	const { request, env, next, waitUntil } = contexto;
	const armazem = env?.CONTAGENS;
	const conta = armazem ? oQueContar(request) : null;

	if (armazem && conta) {
		waitUntil(
			(async () => {
				try {
					const chave = `c:${diaDeLisboa()}:${conta}`;
					const antes = Number(await armazem.get(chave)) || 0;
					// 120 dias: chega para ver uma época a andar e limpa-se sozinho, sem nenhuma
					// tarefa de manutenção a existir só para isto.
					await armazem.put(chave, String(antes + 1), { expirationTtl: 60 * 60 * 24 * 120 });
				} catch {
					// Uma contagem perdida não é motivo para nada: o que interessa é a ordem de
					// grandeza. Duas visitas no mesmo instante também podem perder um incremento,
					// porque isto é ler-somar-escrever e não é atómico — e é um preço justo por
					// não precisar de plano pago.
				}
			})()
		);
	}

	return next();
}
