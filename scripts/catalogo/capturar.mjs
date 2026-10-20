/**
 * Fotografa os ecrãs da app a 375×812, nos dois temas, para o catálogo de componentes.
 *
 * ## Porque é que isto é um script e não um dedo no browser
 *
 * São 23 ecrãs × 2 temas = 46 capturas. À mão, uma ronda leva perto de uma hora e sai
 * diferente de cada vez — um rolo a meio, um menu aberto, um dia com outros jogos. O
 * pedido do dono (issue #4 do `ok4sticks-sugestoes`) é de *"alterações progressivas"*:
 * o designer desenha um componente, nós integramos, e o catálogo tem de voltar a ser
 * tirado para ele ver o que mudou. Contando só três rondas, o script paga-se à segunda.
 *
 * Não corre no CI e não entra no `npm ci` do `web/` — tem `package.json` próprio
 * exactamente para o Playwright não passar a ser dependência do build.
 *
 *     cd scripts/catalogo && npm install
 *     npm --prefix ../../web run dev -- --port 5173     # noutro terminal
 *     node capturar.mjs                                  # escreve em capturas/
 *
 * Com `BASE=https://hoquei.pages.dev node capturar.mjs` fotografa produção.
 *
 * ## O que é fixo aqui, e porquê
 *
 * - **375×812** é a medida em que o projecto verifica o que é visível (ver `AGENTS.md`).
 * - **`deviceScaleFactor: 2`** porque o designer vai ampliar estas imagens; a 1× o texto
 *   de 11px fica ilegível e ele desenha a adivinhar.
 * - **Captura inteira, não só o que cabe no ecrã.** A dobra está marcada na imagem por uma
 *   linha fina: ele precisa de ver o ecrã todo *e* de saber onde ele é cortado no telemóvel.
 * - **A data fixa-se** em `?dia=`, senão duas rondas tiradas em dias diferentes não se
 *   comparam. Vem do `meta.json`, que é o dia a que os dados pertencem.
 */
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ECRAS, FAVORITOS } from './ecras.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..', '..');
const DESTINO = join(AQUI, 'capturas');
const BASE = process.env.BASE ?? 'http://localhost:5173';

/** O dia dos dados publicados, para as capturas de duas rondas serem comparáveis. */
function diaDosDados() {
	const meta = JSON.parse(
		readFileSync(join(RAIZ, 'web/static/v1/aplisboa/2026-27/meta.json'), 'utf8')
	);
	return meta.generated_at.slice(0, 10);
}

/**
 * A linha da dobra: onde o ecrã do telemóvel acaba.
 *
 * Desenhada por cima da página e não na imagem depois, para não precisar de uma
 * biblioteca de imagem só para isto.
 */
const DOBRA = `
	<div style="position:absolute;top:812px;left:0;right:0;height:0;
		border-top:1px dashed rgba(220,38,38,.75);z-index:2147483647;pointer-events:none"></div>
	<div style="position:absolute;top:812px;right:4px;z-index:2147483647;pointer-events:none;
		font:700 9px/1.4 system-ui;color:#fff;background:rgba(220,38,38,.9);
		padding:1px 5px;border-radius:0 0 4px 4px">dobra do ecrã · 812px</div>`;

/**
 * Põe o cromado fixo no fim da imagem, em vez de a meio dela.
 *
 * Numa captura de página inteira o Playwright desenha o que é `position: fixed` onde ele
 * está **no ecrã** — isto é, a 812px do topo. O resultado foi a barra de navegação e a
 * bolha de opinião atravessadas pelo meio da tabela do Mérito, e um designer a olhar para
 * aquilo tem de adivinhar que não é assim que a app se vê.
 *
 * A correcção é passá-los a `absolute` dentro de um `body` posicionado: aí o `bottom: 0`
 * passa a querer dizer o fim do documento e não o fim do ecrã. O que a imagem perde é a
 * sobreposição — e é por isso que a linha da dobra continua lá, a dizer onde o telemóvel
 * corta.
 */
function assentarFixos() {
	// sem isto o `absolute` ancora ao bloco inicial, que tem a altura do ecrã — o mesmo erro
	document.body.style.position = 'relative';
	for (const el of document.querySelectorAll('body *')) {
		if (getComputedStyle(el).position !== 'fixed') continue;
		el.style.position = 'absolute';
	}
}

async function capturar(contexto, ecra, tema, dia) {
	const pag = await contexto.newPage();
	const url = new URL(ecra.url, BASE);
	if (!url.searchParams.has('dia') && url.pathname === '/') url.searchParams.set('dia', dia);

	// O tema e os favoritos têm de estar escritos **antes** de a app arrancar, senão ela
	// pinta-se com a omissão e só depois se corrige — e a captura apanha o meio do caminho.
	// O guia e o convite de instalar aparecem a quem nunca os viu, e tapavam todas as
	// capturas. Dão-se por vistos, e o ecrã que os quer mostrar pede-os de volta em `chaves`.
	const chaves = {
		'hoquei:tema:v1': tema,
		'hoquei:guia-visto:v2': '1',
		'hoquei:convite-visto:v1': '1',
		'hoquei:favoritos:v1': ecra.semFavoritos ? null : JSON.stringify(FAVORITOS),
		...(ecra.chaves ?? {})
	};
	await pag.addInitScript((chaves) => {
		try {
			for (const [k, v] of Object.entries(chaves)) {
				if (v === null) localStorage.removeItem(k);
				else localStorage.setItem(k, v);
			}
		} catch {
			/* sem armazenamento a app abre na mesma; a captura é que fica na omissão */
		}
	}, chaves);

	await pag.goto(url.toString(), { waitUntil: 'networkidle' });
	await pag.waitForTimeout(600);
	if (ecra.prepara) await ecra.prepara(pag);
	// as imagens dos emblemas são `loading=lazy`: sem isto as de baixo saem em branco
	await pag.evaluate(() => {
		for (const i of document.querySelectorAll('img[loading="lazy"]')) i.loading = 'eager';
	});
	await pag.waitForTimeout(500);
	await pag.evaluate(assentarFixos);
	await pag.evaluate((marca) => document.body.insertAdjacentHTML('beforeend', marca), DOBRA);

	const ficheiro = join(DESTINO, `${ecra.id}--${tema}.png`);
	await pag.screenshot({ path: ficheiro, fullPage: true });
	const { width, height } = await pag.evaluate(() => ({
		width: document.documentElement.scrollWidth,
		height: document.documentElement.scrollHeight
	}));
	await pag.close();
	return { ficheiro: `${ecra.id}--${tema}.png`, largura: width, altura: height };
}

const dia = diaDosDados();
mkdirSync(DESTINO, { recursive: true });

const navegador = await chromium.launch();
const contexto = await navegador.newContext({
	viewport: { width: 375, height: 812 },
	deviceScaleFactor: 2,
	locale: 'pt-PT',
	timezoneId: 'Europe/Lisbon',
	// o relógio do dispositivo decide o "hoje" da fita de datas e o "há 10h" do cabeçalho
	reducedMotion: 'reduce'
});

// Um ecrã que falha **não pára a ronda**: o catálogo com 24 de 25 serve, e a lista das
// falhas no fim diz logo o que arranjar. Uma ronda inteira perdida por um separador
// renomeado é que não serve.
const indice = [];
const falhas = [];
for (const ecra of ECRAS) {
	for (const tema of ['claro', 'escuro']) {
		try {
			const r = await capturar(contexto, ecra, tema, dia);
			indice.push({ ...ecra, prepara: undefined, tema, ...r });
			console.log(`${r.ficheiro}  ${r.largura}×${r.altura}`);
		} catch (erro) {
			falhas.push(`${ecra.id}--${tema}: ${erro.message.split('\n')[0]}`);
			console.error(`✗ ${ecra.id}--${tema}`);
		}
	}
}

await navegador.close();
writeFileSync(
	join(DESTINO, 'indice.json'),
	JSON.stringify({ dia, base: BASE, tirado_em: new Date().toISOString(), ecras: indice }, null, '\t')
);
console.log(`\n${indice.length} capturas em ${DESTINO}`);
if (falhas.length) {
	console.error(`\n${falhas.length} falharam:`);
	for (const f of falhas) console.error(`  ${f}`);
	process.exitCode = 1;
}
