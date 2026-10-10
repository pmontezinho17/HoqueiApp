/**
 * A porta dos sites de ramo (10/10/2026).
 *
 * Nasceu de um acidente: o endereço do ramo `testes` foi partilhado em vez do de produção, e
 * ficaram pessoas a ver dados de 26 horas antes num dia com 36 jogos. Estes testes guardam as
 * três decisões que fazem a porta funcionar e que não se adivinham a ler o código:
 *
 * 1. **Produção nunca é travada.** Um `ehSiteDeRamo` que diga `true` a `hoquei.pages.dev`
 *    fecha a app a toda a gente. É o pior defeito possível aqui, e por isso é o primeiro teste.
 * 2. **Os pedidos que não são navegação passam.** É o que deixa o service worker de um
 *    telemóvel onde o ramo foi instalado actualizar-se e sair sozinho.
 * 3. **Sem chave configurada não se entra.** A porta falha fechada.
 */
import { describe, expect, it } from 'vitest';
import { PRODUCAO, ehSiteDeRamo, paraProducao, temChaveDoRamo } from './ambiente.js';
import { COOKIE, MARCA, porta } from './portaTestes.js';
import { oQueFazerNoRamo, onRequest, ramoDe } from '../../functions/_middleware.js';

const CHAVE = 'chave-de-teste';

function pedido(url: string, cabecalhos: Record<string, string> = {}) {
	return new Request(url, { headers: cabecalhos });
}

const navegacao = { 'Sec-Fetch-Mode': 'navigate' };

/** Um telemóvel a sério: o contador ignora quem não se identifica como browser. */
const TELEMOVEL =
	'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 ' +
	'(KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

describe('ehSiteDeRamo', () => {
	it('o site a sério nunca é um site de ramo', () => {
		expect(ehSiteDeRamo(PRODUCAO)).toBe(false);
		expect(ehSiteDeRamo('HOQUEI.PAGES.DEV')).toBe(false);
		expect(ehSiteDeRamo('hoquei.pages.dev:443')).toBe(false);
	});

	it('o endereço de um ramo é', () => {
		for (const h of ['testes.hoquei.pages.dev', 'versoes.hoquei.pages.dev', 'wip-x.hoquei.pages.dev'])
			expect(ehSiteDeRamo(h), h).toBe(true);
	});

	it('o endereço de uma publicação concreta também', () => {
		// a Cloudflare dá os dois, e este copia-se do resumo de uma publicação
		expect(ehSiteDeRamo('99fd44ce.hoquei.pages.dev')).toBe(true);
	});

	it('o desenvolvimento local fica de fora', () => {
		for (const h of ['localhost', 'localhost:5173', '127.0.0.1', ''])
			expect(ehSiteDeRamo(h), h).toBe(false);
		expect(ehSiteDeRamo(null)).toBe(false);
	});
});

describe('paraProducao', () => {
	it('leva o caminho e a pesquisa atrás', () => {
		expect(paraProducao(new URL('https://testes.hoquei.pages.dev/jogo/9905?aba=ficha'))).toBe(
			'https://hoquei.pages.dev/jogo/9905?aba=ficha'
		);
	});

	it('quem abriu um link para um jogo quer aquele jogo, e não a página inicial', () => {
		const d = paraProducao(new URL('https://testes.hoquei.pages.dev/equipa/sub-13/caco-a'));
		expect(d).toContain('/equipa/sub-13/caco-a');
	});
});

describe('oQueFazerNoRamo', () => {
	it('uma navegação sem chave bate na porta', () => {
		expect(oQueFazerNoRamo(pedido('https://testes.hoquei.pages.dev/', navegacao), CHAVE)).toBe(
			'porta'
		);
	});

	it('um Accept de html também conta como navegação', () => {
		const p = pedido('https://testes.hoquei.pages.dev/', { Accept: 'text/html,*/*' });
		expect(oQueFazerNoRamo(p, CHAVE)).toBe('porta');
	});

	it('o que não é navegação passa — é a saída de quem instalou a app', () => {
		for (const u of ['/sw.js', '/manifest.webmanifest', '/v1/aplisboa/2026-27/meta.json'])
			expect(oQueFazerNoRamo(pedido(`https://testes.hoquei.pages.dev${u}`), CHAVE), u).toBe('passa');
	});

	it('a chave certa no endereço deixa entrar', () => {
		const p = pedido(`https://testes.hoquei.pages.dev/?chave=${CHAVE}`, navegacao);
		expect(oQueFazerNoRamo(p, CHAVE)).toBe('entra');
	});

	it('a chave errada volta à porta, e não a um ciclo', () => {
		const p = pedido('https://testes.hoquei.pages.dev/?chave=nao', navegacao);
		expect(oQueFazerNoRamo(p, CHAVE)).toBe('porta-errada');
	});

	it('o cookie da chave certa deixa passar tudo o que venha a seguir', () => {
		const p = pedido('https://testes.hoquei.pages.dev/competicoes', {
			...navegacao,
			Cookie: `outro=1; ${COOKIE}=${CHAVE}`
		});
		expect(oQueFazerNoRamo(p, CHAVE)).toBe('passa');
	});

	it('um cookie com a chave antiga não serve', () => {
		const p = pedido('https://testes.hoquei.pages.dev/', {
			...navegacao,
			Cookie: `${COOKIE}=chave-velha`
		});
		expect(oQueFazerNoRamo(p, CHAVE)).toBe('porta');
	});

	it('sem chave configurada não entra ninguém — a porta falha fechada', () => {
		const comChave = pedido(`https://testes.hoquei.pages.dev/?chave=${CHAVE}`, navegacao);
		expect(oQueFazerNoRamo(comChave, undefined)).toBe('porta-sem-chave');
		expect(oQueFazerNoRamo(pedido('https://testes.hoquei.pages.dev/', navegacao), '')).toBe(
			'porta-sem-chave'
		);
		// e um cookie inventado não dá a volta a isso
		const comCookie = pedido('https://testes.hoquei.pages.dev/', {
			...navegacao,
			Cookie: `${COOKIE}=seja-o-que-for`
		});
		expect(oQueFazerNoRamo(comCookie, undefined)).toBe('porta-sem-chave');
	});
});

describe('a página da porta', () => {
	const html = porta({ destino: 'https://hoquei.pages.dev/jogo/9905' });

	it('monta-se inteira — o template dentro de template já se partiu cinco vezes', () => {
		expect(html.startsWith('<!doctype html>')).toBe(true);
		expect(html.trimEnd().endsWith('</html>')).toBe(true);
		expect(html).not.toContain('undefined');
		expect(html).not.toContain('[object Object]');
	});

	it('o caminho para o site a sério vem antes da caixa da chave', () => {
		// a pessoa que aqui chega por engano é a que mais precisa de uma indicação
		expect(html.indexOf('class="ir"')).toBeLessThan(html.indexOf('Sou eu'));
	});

	it('o botão leva o caminho em que a pessoa estava', () => {
		expect(html).toContain('href="https://hoquei.pages.dev/jogo/9905"');
	});

	it('diz a morada a guardar, e é a de produção', () => {
		expect(html).toContain(`<b>${PRODUCAO}</b>`);
	});

	it('diz que os resultados estão parados — é essa a informação que falta a quem chega', () => {
		expect(html).toMatch(/resultados aqui est[ãa]o parados/i);
	});

	it('com a chave errada, abre a caixa em vez de a deixar escondida', () => {
		const h = porta({ destino: 'https://hoquei.pages.dev/', errada: true });
		expect(h).toContain('Essa chave não serve');
		expect(h).toContain("querySelector('details').open = true");
	});

	it('sem chave configurada, diz onde a definir em vez de uma caixa que não serve', () => {
		const h = porta({ destino: 'https://hoquei.pages.dev/', semChave: true });
		expect(h).toContain('CHAVE_TESTES');
		expect(h).not.toContain('<form');
	});

	it('não se indexa', () => {
		expect(html).toContain('noindex');
	});
});

describe('a ligação ao onRequest — o defeito que fecharia a app a toda a gente', () => {
	/**
	 * Os testes acima provam a decisão; este prova a **ligação**. Se o `ehSiteDeRamo` for
	 * chamado com a coisa errada — o caminho em vez do anfitrião, a URL inteira, o `Host` de
	 * um proxy — a porta aparece em produção e ninguém entra na app. É o pior que pode sair
	 * daqui, e não se vê a ler o código: vê-se a correr os dois casos lado a lado.
	 */
	const semBD = { DADOS: undefined, CHAVE_TESTES: CHAVE };
	const passou = new Response('a app', { headers: { 'Content-Type': 'text/html' } });
	const contexto = (url: string) => ({
		request: pedido(url, navegacao),
		env: semBD,
		next: async () => passou,
		waitUntil: () => {}
	});

	it('em produção a app é servida, aconteça o que acontecer', async () => {
		for (const u of ['https://hoquei.pages.dev/', 'https://hoquei.pages.dev/jogo/9905?x=1']) {
			const r = await onRequest(contexto(u));
			expect(r, u).toBe(passou);
		}
	});

	it('num ramo é a porta que responde, e com 200', async () => {
		const r = await onRequest(contexto('https://testes.hoquei.pages.dev/'));
		expect(r).not.toBe(passou);
		expect(r.status).toBe(200);
		expect(await r.text()).toMatch(/resultados aqui est[ãa]o parados/i);
	});

	it('a chave certa devolve o cookie e tira-a do endereço', async () => {
		const r = await onRequest(contexto(`https://testes.hoquei.pages.dev/mais?chave=${CHAVE}`));
		expect(r.status).toBe(303);
		expect(r.headers.get('Location')).toBe('/mais');
		const cookie = r.headers.get('Set-Cookie') ?? '';
		expect(cookie).toContain(`${COOKIE}=${CHAVE}`);
		// sem `HttpOnly` qualquer script da página podia lê-lo, e nenhum precisa
		expect(cookie).toContain('HttpOnly');
		expect(cookie).toContain('Secure');
	});

	it('o cookie nunca é posto em produção — a /privacidade promete zero cookies', async () => {
		const r = await onRequest(contexto(`https://hoquei.pages.dev/?chave=${CHAVE}`));
		expect(r.headers.get('Set-Cookie')).toBe(null);
	});
});

describe('contar quem bate à porta', () => {
	/**
	 * Pedido pelo dono a 10/10/2026 — *"Sim quero saber"* — e a pergunta é uma decisão: se
	 * daqui a uns dias ainda houver gente a bater, o link anda a circular e ele tem de avisar
	 * as pessoas em vez de esperar que a porta resolva sozinha.
	 */
	function espiaD1() {
		const escritas: { sql: string; valores: unknown[] }[] = [];
		const bd = {
			prepare: (sql: string) => ({
				bind: (...valores: unknown[]) => ({
					run: async () => {
						escritas.push({ sql, valores });
						return { success: true };
					}
				})
			})
		};
		return { bd, escritas };
	}

	function correr(url: string, chave: string | undefined = CHAVE) {
		const { bd, escritas } = espiaD1();
		const porCorrer: Promise<unknown>[] = [];
		const r = onRequest({
			request: pedido(url, { ...navegacao, 'User-Agent': TELEMOVEL }),
			env: { DADOS: bd as never, CHAVE_TESTES: chave },
			next: async () => new Response('a app'),
			waitUntil: (p: Promise<unknown>) => porCorrer.push(p)
		});
		return { resposta: r, escritas, pronto: Promise.all([r, ...porCorrer]) };
	}

	it('um estranho a ver a porta conta como "aviso", com o nome do ramo', async () => {
		const { escritas, pronto } = correr('https://testes.hoquei.pages.dev/');
		await pronto;
		expect(escritas).toHaveLength(1);
		expect(escritas[0].sql).toContain('INSERT INTO porta');
		expect(escritas[0].valores.slice(1)).toEqual(['testes', 'aviso']);
	});

	it('o dono a usar a chave conta como "entrou", para se poder descontar', async () => {
		const { escritas, pronto } = correr(`https://versoes.hoquei.pages.dev/?chave=${CHAVE}`);
		await pronto;
		expect(escritas[0].valores.slice(1)).toEqual(['versoes', 'entrou']);
	});

	it('quem já tem o cookie não volta a contar — senão cada clique dele era uma pessoa', async () => {
		const { bd, escritas } = espiaD1();
		await onRequest({
			request: pedido('https://testes.hoquei.pages.dev/mais', {
				...navegacao,
				'User-Agent': TELEMOVEL,
				Cookie: `${COOKIE}=${CHAVE}`
			}),
			env: { DADOS: bd as never, CHAVE_TESTES: CHAVE },
			next: async () => new Response('a app'),
			waitUntil: () => {}
		});
		expect(escritas).toHaveLength(0);
	});

	it('A PROMESSA: tráfego de ramo nunca escreve nas contagens reais', async () => {
		/**
		 * O `ramo.yml` promete que o tráfego de testes não entra nos números reais. Até hoje
		 * isso era garantido por não haver ligação à base de dados no ambiente de Preview;
		 * agora a ligação existe para a tabela `porta`, e quem garante a promessa é o `return`
		 * antecipado do middleware. É o género de linha que se perde numa reorganização sem
		 * ninguém notar — e o que se notava, meses depois, eram números reais inflados.
		 */
		for (const u of ['https://testes.hoquei.pages.dev/', 'https://testes.hoquei.pages.dev/clube']) {
			const { escritas, pronto } = correr(u);
			await pronto;
			for (const e of escritas) {
				expect(e.sql, u).not.toContain('visita');
				expect(e.sql, u).not.toContain('aparelho');
			}
		}
	});

	it('sem ligação à base de dados a porta funciona e não rebenta', async () => {
		const r = await onRequest({
			request: pedido('https://testes.hoquei.pages.dev/', navegacao),
			env: { DADOS: undefined, CHAVE_TESTES: CHAVE },
			next: async () => new Response('a app'),
			waitUntil: () => {
				throw new Error('não devia haver nada para esperar');
			}
		});
		expect(r.status).toBe(200);
	});
});

describe('ramoDe', () => {
	it('o primeiro pedaço do anfitrião', () => {
		expect(ramoDe('testes.hoquei.pages.dev')).toBe('testes');
		expect(ramoDe('99fd44ce.hoquei.pages.dev')).toBe('99fd44ce');
	});

	it('um Host inventado não escreve uma chave de 2 KB na base de dados', () => {
		expect(ramoDe(`${'x'.repeat(500)}.hoquei.pages.dev`)).toHaveLength(40);
		expect(ramoDe('')).toBe('desconhecido');
	});
});

describe('o contador conta pessoas, e não as minhas verificações', () => {
	/**
	 * A pergunta é "quantas pessoas ainda batem no endereço errado". Um `curl` meu a confirmar
	 * que a porta está de pé não é uma pessoa, e já tinha acontecido: seis chamadas minhas a
	 * verificar teriam entrado no total e o número diria "ainda há gente" quando era eu.
	 */
	function comAgente(ua: string | null) {
		const escritas: string[] = [];
		const bd = {
			prepare: () => ({ bind: () => ({ run: async () => escritas.push('x') }) })
		};
		const porCorrer: Promise<unknown>[] = [];
		const cabecalhos: Record<string, string> = { ...navegacao };
		if (ua !== null) cabecalhos['User-Agent'] = ua;
		const feito = onRequest({
			request: pedido('https://testes.hoquei.pages.dev/', cabecalhos),
			env: { DADOS: bd as never, CHAVE_TESTES: CHAVE },
			next: async () => new Response('a app'),
			waitUntil: (p: Promise<unknown>) => porCorrer.push(p)
		});
		return Promise.all([feito, ...porCorrer]).then(() => escritas.length);
	}

	it('um telemóvel conta', async () => {
		expect(await comAgente(TELEMOVEL)).toBe(1);
	});

	it('as ferramentas com que eu verifico não contam', async () => {
		for (const ua of ['curl/8.7.1', 'Wget/1.21', 'python-httpx/0.27', 'node-fetch/3'])
			expect(await comAgente(ua), ua).toBe(0);
	});

	it('nem robôs nem browsers sem ecrã', async () => {
		for (const ua of ['Googlebot/2.1', 'HeadlessChrome/120', 'uptime-monitor/1.0'])
			expect(await comAgente(ua), ua).toBe(0);
	});

	it('sem User-Agent nenhum também não — não há telemóvel que não o mande', async () => {
		expect(await comAgente(null)).toBe(0);
	});
});

describe('a marca que impede o aviso de tapar quem tem a chave', () => {
	/**
	 * O defeito, a 10/10/2026: o dono definiu a `CHAVE_TESTES`, abriu o site de testes e viu o
	 * `SaidaDoRamo` — servido pela cache do telemóvel dele, sem nunca chegar ao servidor e sem
	 * caixa de chave nenhuma. Não havia maneira de entrar; só havia maneira de sair.
	 *
	 * A causa é que o cookie que autoriza é `HttpOnly` e a app não lhe pode tocar. Daí a
	 * segunda, sem segredo lá dentro, que só serve para a app se calar.
	 */
	it('a porta devolve as duas: a que autoriza e a que a app lê', async () => {
		const r = await onRequest({
			request: pedido(`https://testes.hoquei.pages.dev/?chave=${CHAVE}`, navegacao),
			env: { DADOS: undefined, CHAVE_TESTES: CHAVE },
			next: async () => new Response('a app'),
			waitUntil: () => {}
		});
		const postas = r.headers.getSetCookie();
		expect(postas).toHaveLength(2);
		const autoriza = postas.find((c) => c.startsWith(`${COOKIE}=`)) ?? '';
		const marca = postas.find((c) => c.startsWith(`${MARCA}=`)) ?? '';
		expect(autoriza).toContain('HttpOnly');
		// esta tem de ser legível pelo JavaScript da página, senão não serve para nada
		expect(marca).not.toContain('HttpOnly');
		// e não pode levar o segredo: é vista por qualquer script da origem
		expect(marca).not.toContain(CHAVE);
		expect(marca).toContain(`${MARCA}=1`);
	});

	it('a app reconhece a marca', () => {
		expect(temChaveDoRamo(`${MARCA}=1`)).toBe(true);
		expect(temChaveDoRamo(`outro=x; ${MARCA}=1; mais=y`)).toBe(true);
	});

	it('e não se engana com o que não é ela', () => {
		for (const c of ['', 'outro=1', `${MARCA}=0`, `${MARCA}x=1`, `nao_${MARCA}=1`])
			expect(temChaveDoRamo(c), JSON.stringify(c)).toBe(false);
		expect(temChaveDoRamo(null)).toBe(false);
	});

	it('forjar a marca tira o aviso do ecrã e NÃO abre a porta do servidor', () => {
		// a porta olha para o outro cookie, que leva o segredo
		const p = pedido('https://testes.hoquei.pages.dev/', {
			...navegacao,
			Cookie: `${MARCA}=1`
		});
		expect(oQueFazerNoRamo(p, CHAVE)).toBe('porta');
	});
});
