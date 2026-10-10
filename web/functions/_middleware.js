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
 ## Onde isto é guardado, e porque mudou
 *
 * **Em D1 desde 09/10/2026, antes era KV.** O KV gratuito dá 1 000 escritas por dia e a
 * Cloudflare avisou aos 50%; o D1 dá 100 000 linhas escritas. Mas o que resolve o defeito
 * não é o número: no KV isto era ler-somar-escrever, **que não é atómico** e perdia
 * incrementos quando duas visitas caíam no mesmo instante — medido a 06/10, três pedidos
 * deram dois. Aqui é um `ON CONFLICT ... DO UPDATE SET n = n + 1`, e o SQLite resolve a
 * corrida sozinho. O raciocínio completo está em `dados/esquema.sql`.
 *
 * ## Porque é que continua amostrado
 *
 * A amostragem já não é um tecto, é uma escolha. Numa janela de jogos 20 telemóveis abertos
 * duas horas fazem ~4 800 pedidos de `meta.json`, e num sábado cheio são dezenas de milhar —
 * todos na **mesma linha** da tabela, que o SQLite serializa. Contar 1 em 10 custa um décimo
 * disso e dá a mesma ordem de grandeza, que é a pergunta. O número mostrado é por isso uma
 * estimativa (×10); as navegações, que são poucas, contam-se todas e são exactas.
 *
 * **A contagem nunca atrasa nem parte a página.** Vai toda dentro de `waitUntil` e de um
 * `try`, e sem a ligação à base de dados este ficheiro é um `next()` e mais nada — é isso
 * que permite publicar antes de a ligação existir.
 */

import { ehSiteDeRamo, paraProducao } from '../src/lib/ambiente.js';
import { COOKIE, porta } from '../src/lib/portaTestes.js';

/** 1 em quantos pedidos de dados se contam. Ver "o tecto que obriga a amostragem". */
export const AMOSTRA = 10;

/** O dia em Lisboa, e não em UTC. Já nos custou bugs: à meia-noite e meia de Lisboa o UTC
 *  ainda está no dia anterior, e as contagens de uma jornada nocturna caíam no dia errado. */
const diaDeLisboa = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Lisbon' });

const ECRAS = [
	'/equipa', '/jogo', '/competicoes', '/clube', '/mais', '/privacidade', '/procurar', '/ajuda'
];

/**
 * Caminhos que **não são a aplicação** e por isso não entram na contagem de utilização.
 *
 * A `/consola` é a página de manutenção: só o dono lá vai, e ele vai lá muitas vezes. Medido
 * a 09/10/2026, no dia em que ela nasceu: das 164 navegações do dia, **143 eram recargas da
 * consola** — iam todas para o balde "outros" e o painel "ecrãs abertos hoje" dizia 164 como
 * se fossem pessoas a usar a app.
 *
 * O `/contagens` e o `/contar` estão aqui por coerência: também não são ecrãs.
 *
 * Isto é a irmã da regra do `User-Agent`, e pela mesma razão — um contador que conta quem o
 * vai ler não mede nada.
 */
const NAO_CONTAR = new Set(['/consola', '/contagens', '/contar']);

/**
 * O tipo de ecrã, com os segmentos variáveis descartados. `null` para o que não é a
 * aplicação — ver `NAO_CONTAR`.
 * @param {string} caminho
 * @returns {string | null}
 */
export function ecraDe(caminho) {
	if (caminho === '/' || caminho === '/index.html') return '/';
	const limpo = caminho.replace(/\.html$/, '').replace(/\/+$/, '');
	if (NAO_CONTAR.has(limpo)) return null;
	for (const base of ECRAS) {
		if (limpo === base || limpo.startsWith(`${base}/`)) return base;
	}
	return 'outro';
}

/**
 * Os nossos próprios agentes não são utilizadores.
 *
 * **Isto estava a inflacionar o número que o dono pediu.** O Worker observador lê o
 * `meta.json` **de minuto a minuto** durante as janelas de jogos, e o `scripts/observar.py`
 * lê-o de 20 em 20 segundos quando corre. Ambos passam pela mesma Function e caíam na
 * amostragem como se fossem telemóveis. Medido a 09/10/2026 às 18:50: das 150 aberturas
 * estimadas do dia, cerca de 50 eram o nosso próprio observador, que arrancou às 18:00.
 *
 * É um erro de medição com a forma mais traiçoeira que há — o instrumento a medir-se a si
 * mesmo, e a dar um número que cresce quando olhamos mais para ele.
 *
 * O prefixo `hoqueiAPP` é comum a todos os nossos agentes, de propósito: o `User-Agent`
 * identificável existe desde o início para a fonte saber quem a visita, e serve aqui para o
 * contador saber quem **não** contar.
 */
const NOSSO = /^hoqueiAPP/i;

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
	if (NOSSO.test(pedido.headers.get('User-Agent') ?? '')) return null;
	const caminho = new URL(pedido.url).pathname;

	// o sinal de "alguém tem a app aberta": não depende do service worker, mas é frequente
	if (/^\/v1\/[^/]+\/[^/]+\/meta\.json$/.test(caminho)) {
		return sorteio() < 1 / AMOSTRA ? 'aberturas' : null;
	}

	// uma pessoa a abrir um ecrã de fora da app — primeira visita, link partilhado, recarregar
	const navegacao =
		pedido.headers.get('Sec-Fetch-Mode') === 'navigate' ||
		(pedido.headers.get('Accept') ?? '').includes('text/html');
	// `ecraDe` devolve `null` para o que não é a aplicação — ver `NAO_CONTAR`
	if (navegacao && !caminho.startsWith('/v1/')) return ecraDe(caminho);

	return null;
}

// ─── A porta dos sites de ramo ──────────────────────────────────────────────────────────
//
// Um site de ramo serve os dados do último commit e nunca os do ciclo ao vivo. Enquanto
// esteve aberto a toda a gente, isso foi só uma limitação conhecida; a 10/10/2026 deixou de
// ser, quando o endereço do ramo `testes` foi partilhado em vez do de produção e ficaram
// pessoas a ver resultados de 26 horas antes num dia com 36 jogos.
//
// A porta é nossa e não o Cloudflare Access de propósito — ver `portaTestes.js`.

/**
 * O que fazer com um pedido a um site de ramo: `null` deixa passar.
 *
 * **Só as navegações são travadas, e isso é deliberado.** Um pedido que não é navegação —
 * o `sw.js`, o manifesto, um ficheiro de dados — passa, e passa por uma razão prática: quem
 * instalou o site de ramo no telemóvel tem a app servida pela cache do *service worker* e
 * nunca chega aqui. A única forma de o alcançar é deixá-lo actualizar-se, apanhar a versão
 * que traz o `SaidaDoRamo` e sair sozinho. Travar tudo selava essas pessoas no site errado
 * para sempre, que é exactamente o que se está a tentar desfazer.
 *
 * Não é secretismo nenhum: os dados são os mesmos que o site a sério publica a quem quiser.
 * O que se tranca é **usar** a app do ramo.
 *
 * @param {Request} pedido
 * @param {string | undefined} chaveBoa o segredo `CHAVE_TESTES` do ambiente, se existir
 * @returns {'passa' | 'entra' | 'porta' | 'porta-errada' | 'porta-sem-chave'}
 */
export function oQueFazerNoRamo(pedido, chaveBoa) {
	const url = new URL(pedido.url);
	const dada = url.searchParams.get('chave');
	if (dada !== null) {
		if (!chaveBoa) return 'porta-sem-chave';
		return dada === chaveBoa ? 'entra' : 'porta-errada';
	}
	const cookies = pedido.headers.get('Cookie') ?? '';
	if (chaveBoa && cookies.split(';').some((c) => c.trim() === `${COOKIE}=${chaveBoa}`)) {
		return 'passa';
	}
	const navegacao =
		pedido.headers.get('Sec-Fetch-Mode') === 'navigate' ||
		(pedido.headers.get('Accept') ?? '').includes('text/html');
	if (!navegacao) return 'passa';
	return chaveBoa ? 'porta' : 'porta-sem-chave';
}

/**
 * O que **não** é uma pessoa a abrir o site.
 *
 * O número que o dono quer saber é "quantas pessoas ainda batem no endereço errado", e uma
 * contagem que inclua as verificações feitas com `curl` responde outra pergunta. Já me
 * aconteceu: as seis chamadas que fiz a confirmar que a porta estava de pé teriam entrado
 * no total, e o número diria "ainda há gente" quando era eu.
 *
 * Deliberadamente curto. Não é segurança — ninguém está a tentar inflar isto — é só tirar do
 * caminho o que de certeza não é um telemóvel.
 */
const NAO_E_GENTE = /curl|wget|bot\b|crawler|spider|headless|python-|node-fetch|monitor/i;

/**
 * O nome do ramo, para a tabela. `testes.hoquei.pages.dev` → `testes`.
 *
 * Cortado aos 40 caracteres porque isto entra numa chave primária e vem de um anfitrião, que
 * é entrada de fora: um `Host` inventado não deve poder escrever uma chave de 2 KB.
 *
 * @param {string} anfitriao
 */
export function ramoDe(anfitriao) {
	return (anfitriao ?? '').toLowerCase().split('.')[0].slice(0, 40) || 'desconhecido';
}

/**
 * Conta quem bateu à porta de um site de ramo (`porta` no `esquema.sql`).
 *
 * `aviso` são estranhos a ver a porta; `entrou` é o dono a usar a chave. Separados porque não
 * se podem somar: sem isso, as visitas do próprio a testar apareciam como pessoas perdidas.
 *
 * Em `waitUntil` e dentro de um `try`: isto corre **depois** da página ter sido servida, e uma
 * contagem perdida não vale um ecrã em branco a quem já se enganou no endereço uma vez.
 *
 * @param {{ env: { DADOS?: import("@cloudflare/workers-types").D1Database },
 *           waitUntil: (p: Promise<unknown>) => void }} contexto
 * @param {string} ramo
 * @param {'aviso' | 'entrou'} evento
 */
function contarNaPorta({ env, waitUntil }, ramo, evento, agente = '') {
	const bd = env?.DADOS;
	if (!bd) return;        // sem ligação no ambiente de Preview: a porta funciona sem contar
	if (!agente || NAO_E_GENTE.test(agente)) return;
	waitUntil(
		(async () => {
			try {
				await bd
					.prepare(
						`INSERT INTO porta (dia, ramo, evento, n) VALUES (?, ?, ?, 1)
						 ON CONFLICT (dia, ramo, evento) DO UPDATE SET n = n + 1`
					)
					.bind(diaDeLisboa(), ramo, evento)
					.run();
			} catch {
				/* ver acima: a página já foi servida */
			}
		})()
	);
}

/**
 * @param {Request} pedido
 * @param {{ errada?: boolean, semChave?: boolean }} opcoes
 */
function respostaDaPorta(pedido, opcoes) {
	const url = new URL(pedido.url);
	url.searchParams.delete('chave');
	return new Response(porta({ destino: paraProducao(url), ...opcoes }), {
		// 200 e não 401 ou 403: isto é sobretudo um aviso a quem se enganou no endereço, e um
		// 403 põe o browser a desenhar a sua própria página de erro por cima deste texto.
		status: 200,
		headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
	});
}

/**
 * @param {{
 *   request: Request,
 *   env: { DADOS?: import("@cloudflare/workers-types").D1Database, CHAVE_TESTES?: string },
 *   next: () => Promise<Response>,
 *   waitUntil: (promessa: Promise<unknown>) => void
 * }} contexto
 */
export async function onRequest(contexto) {
	const { request, env, next, waitUntil } = contexto;

	if (ehSiteDeRamo(new URL(request.url).hostname)) {
		const ramo = ramoDe(new URL(request.url).hostname);
		const decisao = oQueFazerNoRamo(request, env?.CHAVE_TESTES);
		if (decisao !== 'passa') {
			contarNaPorta(
				contexto,
				ramo,
				decisao === 'entra' ? 'entrou' : 'aviso',
				request.headers.get('User-Agent') ?? ''
			);
		}
		switch (decisao) {
			case 'entra': {
				// A chave vai uma vez no endereço e volta como cookie, para não ficar na barra
				// nem no histórico. `HttpOnly` porque nenhum script precisa de a ler.
				//
				// **Este é o único cookie do projecto, e nunca é posto em produção** — a guarda
				// em volta é o `ehSiteDeRamo`. A `/privacidade` continua verdadeira onde é lida:
				// no site que as pessoas usam. Aqui, só o aparece a quem escreveu a chave.
				const url = new URL(request.url);
				url.searchParams.delete('chave');
				return new Response(null, {
					status: 303,
					headers: {
						Location: url.pathname + url.search + url.hash,
						'Set-Cookie':
							`${COOKIE}=${env.CHAVE_TESTES}; Path=/; Max-Age=2592000; ` +
							'Secure; HttpOnly; SameSite=Lax',
						'Cache-Control': 'no-store'
					}
				});
			}
			case 'porta':
				return respostaDaPorta(request, {});
			case 'porta-errada':
				return respostaDaPorta(request, { errada: true });
			case 'porta-sem-chave':
				return respostaDaPorta(request, { semChave: true });
		}
		// 'passa' — e daqui sai-se **sem** passar pelo contador do `visita`, que é o que o
		// `ramo.yml` promete: o tráfego de testes não entra nas contagens reais. Até
		// 10/10/2026 essa promessa era garantida por não haver ligação à base de dados neste
		// ambiente; agora a ligação existe, para a tabela `porta`, e quem a garante é esta
		// linha. Há um teste só para ela.
		return next();
	}

	const bd = env?.DADOS;
	const conta = bd ? oQueContar(request) : null;

	if (bd && conta) {
		waitUntil(
			(async () => {
				try {
					await bd
						.prepare(
							`INSERT INTO visita (dia, ecra, n) VALUES (?, ?, 1)
							 ON CONFLICT (dia, ecra) DO UPDATE SET n = n + 1`
						)
						.bind(diaDeLisboa(), conta)
						.run();
				} catch {
					// Uma contagem perdida não é motivo para nada: o que interessa é a ordem de
					// grandeza, e a página já foi servida há muito — isto corre depois dela.
				}
			})()
		);
	}

	return next();
}
