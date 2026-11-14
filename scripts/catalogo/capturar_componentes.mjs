/**
 * Fotografa cada componente **sozinho**, em cada estado e nos dois temas.
 *
 * ## Porque é que não é um Storybook
 *
 * Um Storybook obrigava a montar cada componente à mão com propriedades inventadas, e isso
 * tem dois custos que não se pagam aqui: entra código novo na aplicação só para o catálogo,
 * e o que o designer vê deixa de ser a app — passa a ser uma encenação que diverge dela em
 * silêncio. Isto fotografa o componente **onde ele vive**, com os dados verdadeiros, e
 * recorta-o. Quando o ecrã muda, a captura muda com ele.
 *
 * O preço é não haver estados que os dados não tenham. Para esses há a reescrita da agenda
 * (ver `jogoADecorrer` no `componentes.mjs`), e cada captura dessas sai marcada como
 * forçada no catálogo. Um catálogo que não distingue o real do encenado não serve para
 * medir nada.
 *
 *     npm --prefix ../../web run dev     # noutro terminal
 *     node capturar_componentes.mjs
 *
 * Com `BASE=https://hoquei.pages.dev` fotografa produção.
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { COMPONENTES } from './componentes.mjs';
import { FAVORITOS } from './ecras.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..', '..');
const DESTINO = join(AQUI, 'capturas', 'componentes');
const BASE = process.env.BASE ?? 'http://localhost:5173';

/**
 * Os aparelhos que se fingem, para os estados que só existem num deles.
 *
 * O convite para instalar (C49) só aparece no iPhone e no iPad — no Android o sistema trata
 * disto sozinho —, e o `decidirConvite()` decide pelo `userAgent` e pelo
 * `navigator.standalone`. O `standalone` tem **três** valores que importam e não dois: `true`
 * é "já está instalada", `false` é "Safari", e **não existir** é uma vista embutida dentro de
 * outra aplicação. O Playwright não o define, por isso é preciso pô-lo à mão para distinguir
 * os dois convites.
 */
const APARELHOS = {
	iphone: {
		userAgent:
			'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
		standalone: false
	},
	'iphone-embutido': {
		userAgent:
			'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
		standalone: undefined
	}
};

/** Um nome de ficheiro a partir do nome do estado: sem acentos, sem espaços. */
const fatiar = (s) =>
	s
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');

async function capturar(navegador, comp, estado, tema) {
	// O endereço e o aparelho são do **contexto** e não da página: um `userAgent` próprio ou
	// um site diferente não se trocam numa aba já aberta. Os estados comuns reusam o contexto
	// de omissão; só os poucos que precisam de outro aparelho abrem o seu.
	const aparelho = estado.aparelho ? APARELHOS[estado.aparelho] : null;
	if (estado.aparelho && !aparelho) throw new Error(`aparelho "${estado.aparelho}" não existe`);
	const contexto = aparelho
		? await navegador.newContext({ ...CONTEXTO, userAgent: aparelho.userAgent })
		: comum;
	const pag = await contexto.newPage();
	if (aparelho) {
		await pag.addInitScript((v) => {
			// `undefined` quer dizer "não definir" — é assim que uma vista embutida se apresenta
			if (v !== null) Object.defineProperty(navigator, 'standalone', { value: v, configurable: true });
		}, aparelho.standalone === undefined ? null : aparelho.standalone);
	}

	const chaves = {
		'hoquei:tema:v1': tema,
		'hoquei:guia-visto:v2': '1',
		'hoquei:convite-visto:v1': '1',
		'hoquei:favoritos:v1': estado.semFavoritos ? null : JSON.stringify(FAVORITOS),
		...(estado.chaves ?? {})
	};
	await pag.addInitScript((chaves) => {
		try {
			for (const [k, v] of Object.entries(chaves)) {
				if (v === null) localStorage.removeItem(k);
				else localStorage.setItem(k, v);
			}
		} catch {
			/* sem armazenamento a app abre na mesma */
		}
	}, chaves);

	// Um estado que os dados de hoje não têm — um jogo a decorrer, uma tabela calculada —
	// reescreve-se **antes** de a página ler o ficheiro. Intercepta-se o pedido em vez de
	// mexer nos dados publicados: a árvore de trabalho não fica suja e a captura seguinte
	// volta ao real sozinha. Cada captura destas sai marcada como forçada no catálogo.
	if (estado.forjar) {
		await pag.route(estado.forjar.padrao, async (rota) => {
			const resposta = await rota.fetch();
			const corpo = estado.forjar.transformar(await resposta.json());
			await rota.fulfill({ response: resposta, body: JSON.stringify(corpo) });
		});
	}

	await pag.goto(new URL(estado.url, estado.base ?? BASE).toString(), { waitUntil: 'networkidle' });
	await pag.waitForTimeout(500);
	if (estado.prepara) await estado.prepara(pag);
	await pag.evaluate(() => {
		for (const i of document.querySelectorAll('img[loading="lazy"]')) i.loading = 'eager';
	});
	await pag
		.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 8000 })
		.catch(() => {
			/* uma imagem que nunca chega não vale perder a captura; o `aposAssentar` protege */
		});

	const alvo = pag.locator(estado.seletor).first();
	await alvo.waitFor({ state: 'visible', timeout: 8000 });

	const caixa = await alvo.boundingBox();
	if (!caixa) throw new Error(`"${estado.seletor}" não tem caixa — está escondido?`);

	// **O recorte é do próprio elemento, e não um rectângulo calculado por nós.**
	//
	// A primeira versão media com `boundingBox()` e passava o rectângulo ao
	// `page.screenshot({ clip })`. Saía deslocado, e a razão é que as duas medidas não falam
	// do mesmo sítio: o `boundingBox()` conta a partir do canto do ecrã e o `clip` conta a
	// partir do canto do documento. Enquanto o alvo estava no topo as duas coincidiam e
	// parecia bem; a partir do momento em que era preciso rolar para lá chegar, o recorte
	// subia o tanto que a página tinha rolado — a captura de "jogo por começar" apanhava o
	// cabeçalho do bloco em vez da linha.
	//
	// O `locator.screenshot()` não tem esse problema e ainda espera que o elemento pare de
	// se mexer antes de disparar. O ar à volta deixa de ser recortado da página e passa a ser
	// o `padding` da moldura no catálogo, que é onde ele faz falta.
	const ficheiro = `${comp.id}-${fatiar(comp.nome)}--${fatiar(estado.nome)}--${tema}.png`;
	await alvo.screenshot({ path: join(DESTINO, ficheiro) });
	await pag.close();
	if (aparelho) await contexto.close();
	// a largura em px de CSS é a que o catálogo usa para mostrar a imagem no tamanho real:
	// o ficheiro tem o dobro dos pixels, por ser de dupla densidade
	return { ficheiro, largura: Math.round(caixa.width), altura: Math.round(caixa.height) };
}

/** O telemóvel em que este projecto verifica tudo o que é visível — ver o `AGENTS.md`. */
const CONTEXTO = {
	viewport: { width: 375, height: 812 },
	deviceScaleFactor: 2,
	locale: 'pt-PT',
	timezoneId: 'Europe/Lisbon',
	reducedMotion: 'reduce'
};

mkdirSync(DESTINO, { recursive: true });
const navegador = await chromium.launch();
const comum = await navegador.newContext(CONTEXTO);

// Um componente que falhe **não pára a ronda**: o catálogo com 52 de 53 estados serve, e a
// lista das falhas no fim diz logo que selector é que deixou de encontrar o que procurava.
const saida = [];
const falhas = [];
for (const comp of COMPONENTES) {
	for (const estado of comp.estados) {
		const temas = [];
		for (const tema of ['claro', 'escuro']) {
			try {
				temas.push({ tema, ...(await capturar(navegador, comp, estado, tema)) });
			} catch (erro) {
				falhas.push(`${comp.id} ${comp.nome} · ${estado.nome} · ${tema}: ${erro.message.split('\n')[0]}`);
			}
		}
		if (temas.length) {
			console.log(`${comp.id} ${comp.nome} · ${estado.nome} — ${temas[0].largura}×${temas[0].altura}`);
			saida.push({ id: comp.id, estado: estado.nome, temas });
		}
	}
}

await navegador.close();

const meta = JSON.parse(readFileSync(join(RAIZ, 'web/static/v1/aplisboa/2026-27/meta.json'), 'utf8'));
writeFileSync(
	join(DESTINO, 'indice.json'),
	JSON.stringify(
		{ base: BASE, dia: meta.generated_at.slice(0, 10), tirado_em: new Date().toISOString(), capturas: saida },
		null,
		'\t'
	)
);
console.log(`\n${saida.reduce((n, x) => n + x.temas.length, 0)} capturas de componente em ${DESTINO}`);
if (falhas.length) {
	console.error(`\n${falhas.length} falharam:`);
	for (const f of falhas) console.error(`  ${f}`);
	process.exitCode = 1;
}
