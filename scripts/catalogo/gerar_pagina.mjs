/**
 * Monta a página do catálogo: os componentes primeiro, os ecrãs no fim.
 *
 *     node scripts/catalogo/capturar.mjs             # os 25 ecrãs
 *     node scripts/catalogo/capturar_componentes.mjs # os 43 componentes
 *     node scripts/catalogo/exportar_icones.mjs      # os 26 SVG
 *     node scripts/catalogo/gerar_pagina.mjs         # a página
 *
 * A ordem é a do pedido do designer a 19/10/2026 — *"eu assim não desenho páginas, desenho
 * apenas components, que depois irão formar as páginas"*. Os ecrãs ficam no fim porque
 * continuam a ser precisos para uma coisa: ver onde é que cada peça encaixa.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { lerTokens, lerCores, lerVersao, lerEscaloes } from './tokens.mjs';
import { COMPONENTES } from './componentes.mjs';
import { PRODUTO, FIXO, LIVRE, NAO_ENTREGUES, DEVOLVER, RITMO, PORQUE_MUDOU } from './conteudo.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const CAPTURAS = join(AQUI, 'capturas');
const ICONES = join(AQUI, 'icones');

const e = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const indiceEcras = JSON.parse(readFileSync(join(CAPTURAS, 'indice.json'), 'utf8'));
const indiceComp = JSON.parse(readFileSync(join(CAPTURAS, 'componentes', 'indice.json'), 'utf8'));
const { claro, escuro } = lerTokens();
const cores = lerCores();
const versao = lerVersao();
const escaloes = lerEscaloes();

/** As capturas de cada estado, indexadas por `C09|Jogo terminado`. */
const porEstado = new Map(indiceComp.capturas.map((c) => [`${c.id}|${c.estado}`, c]));

const ecras = [];
for (const c of indiceEcras.ecras) {
	let x = ecras.find((y) => y.id === c.id);
	if (!x) ecras.push((x = { ...c, capturas: {} }));
	x.capturas[c.tema] = c;
}

const icones = readdirSync(ICONES)
	.filter((f) => f.endsWith('.svg'))
	.map((f) => ({
		nome: f.replace('.svg', ''),
		svg: readFileSync(join(ICONES, f), 'utf8')
			.replace(/<!--[\s\S]*?-->/g, '')
			.replace(/width="20" height="20"/, 'width="26" height="26"')
			.trim()
	}));

const data = new Date(indiceComp.tirado_em).toLocaleDateString('pt-PT', {
	day: '2-digit', month: 'long', year: 'numeric'
});

const grupos = [...new Set(COMPONENTES.map((c) => c.grupo))];
const comEstados = COMPONENTES.filter((c) => c.estados.length);
const totalEstados = COMPONENTES.reduce((n, c) => n + c.estados.length, 0);

// ── as peças ───────────────────────────────────────────────────────────────────────────

const limpaValor = (v) => (v ?? '').replace(/var\([^,]+,\s*/, '').replace(/\)$/, '');

const linhaDeToken = (nome) => {
	if (!claro.has(nome)) return '';
	const c = limpaValor(claro.get(nome));
	const d = escuro.has(nome) ? limpaValor(escuro.get(nome)) : null;
	return `<tr>
		<th scope="row"><code>${e(nome)}</code></th>
		<td><span class="pastilha" style="background:${e(c)}"></span><code>${e(c)}</code></td>
		<td>${d ? `<span class="pastilha" style="background:${e(d)}"></span><code>${e(d)}</code>` : '<span class="igual">igual</span>'}</td>
	</tr>`;
};

const grupoDeCores = (titulo, nomes, legenda) => `
	<div class="grupo">
		<h4>${e(titulo)}</h4>
		${legenda ? `<p class="legenda">${legenda}</p>` : ''}
		<div class="tabela-rolante"><table class="tokens">
			<thead><tr><th>token</th><th>claro</th><th>escuro</th></tr></thead>
			<tbody>${nomes.map(linhaDeToken).join('')}</tbody>
		</table></div>
	</div>`;

/** Um estado de um componente: o nome, a nota, e a captura nos dois temas. */
function tile(comp, estado) {
	const cap = porEstado.get(`${comp.id}|${estado.nome}`);
	if (!cap) return '';
	const [a, b] = ['claro', 'escuro'].map((t) => cap.temas.find((x) => x.tema === t));
	const larg = (a ?? b)?.largura ?? 320;
	const alt = (a ?? b)?.altura ?? 0;
	const img = (x, classe) =>
		x
			? `<img class="${classe}" src="componentes/${e(x.ficheiro)}" alt="${e(comp.nome)}, ${e(estado.nome)}, tema ${x.tema}" loading="lazy" style="width:${larg}px" ${classe === 'tema-escuro' ? 'hidden' : ''} />`
			: '';
	return `
		<figure class="estado">
			<figcaption>
				<span class="rotulo">${e(estado.nome)}</span>
				<span class="medida">${(a ?? b).largura}×${(a ?? b).altura}</span>
				${estado.forcado ? '<span class="forjado" title="Estado encenado para a captura">forçado</span>' : ''}
			</figcaption>
			<div class="palco${alt > 420 ? ' alto' : ''}">${img(a, 'tema-claro')}${img(b, 'tema-escuro')}</div>
			${estado.nota ? `<p class="nota-estado">${e(estado.nota)}</p>` : ''}
			${estado.forcado ? `<p class="nota-estado forjada">${e(estado.forcado)}</p>` : ''}
		</figure>`;
}

function cartaoDeComponente(comp) {
	return `
	<article class="comp" id="${e(comp.id)}">
		<header>
			<div class="identidade">
				<span class="cod">${e(comp.id)}</span>
				<h3>${e(comp.nome)}</h3>
			</div>
			<p class="oque">${e(comp.oQueE)}</p>
			<dl class="meta">
				<dt>aparece em</dt><dd>${e(comp.onde)}</dd>
				<dt>vive em</dt><dd><code>${e(comp.ficheiro)}</code></dd>
			</dl>
			<p class="partes"><span class="etiqueta">partes</span>${comp.anatomia.map((x) => `<span>${e(x)}</span>`).join('')}</p>
			${comp.nota ? `<p class="porque">${comp.nota}</p>` : ''}
		</header>
		${
			comp.estados.length
				? `<div class="estados">${comp.estados.map((x) => tile(comp, x)).join('')}</div>`
				: '<p class="sem-captura">Sem captura — ver a nota acima.</p>'
		}
	</article>`;
}

const indiceRapido = grupos
	.map(
		(g) => `<div class="familia">
			<h4>${e(g)}</h4>
			<ul>${COMPONENTES.filter((c) => c.grupo === g)
				.map((c) => `<li><a href="#${e(c.id)}"><span class="cod">${e(c.id)}</span>${e(c.nome)}</a></li>`)
				.join('')}</ul>
		</div>`
	)
	.join('');

const catalogo = grupos
	.map(
		(g) => `<section class="familia-seccao">
			<h3 class="familia-titulo">${e(g)}<span>${COMPONENTES.filter((c) => c.grupo === g).length}</span></h3>
			${COMPONENTES.filter((c) => c.grupo === g).map(cartaoDeComponente).join('')}
		</section>`
	)
	.join('');

const grelhaDeIcones = icones
	.map(
		(i) =>
			`<li><span class="desenho">${i.svg}</span>` +
			`<a href="icones/${e(i.nome)}.svg" target="_blank" rel="noopener"><code>${e(i.nome)}</code></a></li>`
	)
	.join('');

const grelhaDeEscaloes = escaloes
	.map((s) => `<li><img src="escaloes/${e(s)}.svg" alt="" width="44" height="44" /><code>${e(s)}</code></li>`)
	.join('');

const galeriaEcras = ecras
	.map(
		(x, i) => `
	<article class="ecra">
		<header>
			<span class="num">${String(i + 1).padStart(2, '0')}</span>
			<div>
				<h4>${e(x.titulo)}</h4>
				<p class="nota">${e(x.nota)}</p>
				<p class="ficheiro"><code>${e(x.id)}</code></p>
			</div>
		</header>
		<div class="telemovel">
			<img class="tema-claro" src="${e(x.capturas.claro.ficheiro)}" alt="${e(x.titulo)}, tema claro" loading="lazy" />
			<img class="tema-escuro" src="${e(x.capturas.escuro.ficheiro)}" alt="${e(x.titulo)}, tema escuro" loading="lazy" hidden />
		</div>
	</article>`
	)
	.join('');

const escalaDeTexto = [...claro]
	.filter(([n]) => n.startsWith('--t-'))
	.map(
		([n, v]) => `<li>
			<span class="exemplo" style="font-size:${e(v)}">CD PAÇO ARCOS 3 – 2 AE FISICA</span>
			<span class="medida"><code>${e(n)}</code> · ${Math.round(parseFloat(v) * 16)} px</span>
		</li>`
	)
	.join('');

const escalaDeEspaco = [...claro]
	.filter(([n]) => n.startsWith('--e-'))
	.map(([n, v]) => `<li><span class="barra" style="width:${e(v)}"></span><code>${e(n)}</code> <span class="medida">${e(v)}</span></li>`)
	.join('');

const raios = [...claro]
	.filter(([n]) => n.startsWith('--raio'))
	.map(([n, v]) => `<li><span class="caixa" style="border-radius:${e(v)}"></span><code>${e(n)}</code> <span class="medida">${e(v)}</span></li>`)
	.join('');

const paleta = cores
	.map(
		(c) => `<li>
			<span class="par"><span style="background:${c.claro}"></span><span style="background:${c.escuro}"></span></span>
			<strong>${e(c.rotulo)}</strong>
			<span class="medida"><code>${c.claro}</code> / <code>${c.escuro}</code></span>
		</li>`
	)
	.join('');

const pagina = `<meta name="claude:viewport-fit-sides" content="cover">
<title>Componentes OK4Sticks</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700&display=swap">
<style>
/* Um componente por cartão: identidade e explicação à esquerda, os estados em fila à
   direita. Uma coluna abaixo de 900px. Os tokens aqui são os do catálogo; os da app estão
   na página, lidos do código. */
:root {
	--papel: #fbfaf7; --superficie: #ffffff; --palco: #f1f0ec;
	--tinta: #16191d; --tinta-2: #565e68; --tinta-3: #8b939d;
	--linha: #e4e2dc; --linha-fraca: #eeece7;
	--marca: #0a7d54; --marca-fraca: #e9f3ef;
	--alerta: #9a3412; --alerta-fraco: #fdf0e7;
	--titulo: Archivo, "Helvetica Neue", Arial, sans-serif;
	--corpo: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
	--codigo: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
}
@media (prefers-color-scheme: dark) {
	:root:not([data-theme="light"]) {
		--papel: #121316; --superficie: #1a1d21; --palco: #101216;
		--tinta: #e9eaec; --tinta-2: #b0b6bd; --tinta-3: #848b93;
		--linha: #2b2f35; --linha-fraca: #22262b;
		--marca: #34d399; --marca-fraca: #13241e;
		--alerta: #fbbf7a; --alerta-fraco: #2a1d12;
		color-scheme: dark;
	}
}
:root[data-theme="dark"] {
	--papel: #121316; --superficie: #1a1d21; --palco: #101216;
	--tinta: #e9eaec; --tinta-2: #b0b6bd; --tinta-3: #848b93;
	--linha: #2b2f35; --linha-fraca: #22262b;
	--marca: #34d399; --marca-fraca: #13241e;
	--alerta: #fbbf7a; --alerta-fraco: #2a1d12;
	color-scheme: dark;
}

*, *::before, *::after { box-sizing: border-box; }
/* O display:block do palco ganhava ao [hidden] do browser e as duas capturas apareciam uma
   por cima da outra — o interruptor de tema não fazia nada. */
[hidden] { display: none !important; }
body { background: var(--papel); color: var(--tinta); font-family: var(--corpo);
	font-size: 15px; line-height: 1.6; }
.envelope { max-width: 74rem; margin: 0 auto;
	padding-left: max(16px, env(safe-area-inset-left, 0px));
	padding-right: max(16px, env(safe-area-inset-right, 0px));
	padding-block: 0 4rem; }
h1, h2, h3, h4 { font-family: var(--titulo); font-weight: 700; text-wrap: balance;
	letter-spacing: -0.015em; margin: 0; }
h1 { font-size: clamp(2rem, 7vw, 3.1rem); line-height: 1.05; }
h2 { font-size: clamp(1.3rem, 4vw, 1.75rem); line-height: 1.15; }
h3 { font-size: 1.05rem; }
h4 { font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.08em;
	color: var(--tinta-2); font-weight: 500; }
p { margin: 0; }
code { font-family: var(--codigo); font-size: 0.86em; }
a { color: var(--marca); }
:focus-visible { outline: 2px solid var(--marca); outline-offset: 2px; border-radius: 3px; }

.capa { display: flex; flex-direction: column; gap: 1.1rem; padding-block: 3rem 2.5rem;
	border-bottom: 2px solid var(--tinta); }
.sobrescrito { font-family: var(--titulo); font-weight: 500; font-size: 0.78rem;
	text-transform: uppercase; letter-spacing: 0.14em; color: var(--marca); }
.capa p.intro { font-size: 1.08rem; color: var(--tinta-2); max-width: 48ch; }
.carimbo { display: flex; flex-wrap: wrap; gap: 0.4rem 1.2rem; font-size: 0.8rem;
	color: var(--tinta-3); font-family: var(--codigo); }

section.bloco { padding-block: 2.6rem; border-bottom: 1px solid var(--linha); }
section.bloco > h2 { margin-bottom: 0.3rem; }
section.bloco > .subtitulo { color: var(--tinta-2); margin-bottom: 1.6rem; max-width: 62ch; }

.mudou { background: var(--marca-fraca); border-left: 3px solid var(--marca);
	border-radius: 0 8px 8px 0; padding: 1.1rem 1.3rem; display: grid; gap: 0.5rem; }
.mudou h2 { font-size: 1.1rem; }
.mudou p { color: var(--tinta-2); max-width: 70ch; }

.regras { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.9rem;
	grid-template-columns: repeat(auto-fit, minmax(min(100%, 19rem), 1fr)); }
.regras li { background: var(--superficie); border: 1px solid var(--linha);
	border-left: 3px solid var(--marca); border-radius: 0 6px 6px 0; padding: 0.9rem 1.1rem;
	min-width: 0; }
.regras strong { display: block; font-family: var(--titulo); font-size: 0.97rem;
	margin-bottom: 0.3rem; }
.regras span { font-size: 0.88rem; color: var(--tinta-2); }
.simples { margin: 0; padding-left: 1.1rem; display: grid; gap: 0.35rem; color: var(--tinta-2); }
.recusa { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.5rem; }
.recusa li { display: grid; grid-template-columns: 1.2rem 1fr; gap: 0.6rem;
	align-items: baseline; font-size: 0.92rem; }
.recusa li::before { content: "×"; color: var(--alerta); font-weight: 700; font-size: 1.1rem; }
.recusa em { font-style: normal; color: var(--tinta-2); }

/* ── índice rápido ───────────────────────────────────────────────────── */
.indice { display: grid; gap: 1.2rem;
	grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr)); }
.familia h4 { margin-bottom: 0.5rem; }
.familia ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.2rem; }
.familia a { display: flex; gap: 0.45rem; align-items: baseline; text-decoration: none;
	color: var(--tinta); font-size: 0.88rem; padding: 0.15rem 0; }
.familia a:hover { color: var(--marca); }
.cod { font-family: var(--codigo); font-size: 0.74rem; color: var(--tinta-3);
	font-variant-numeric: tabular-nums; }

/* ── o interruptor de tema, sempre à mão ─────────────────────────────── */
.controlo { position: sticky; top: env(safe-area-inset-top, 0px); z-index: 5;
	background: var(--papel); padding-block: 0.7rem; margin-bottom: 1.4rem;
	border-bottom: 1px solid var(--linha); display: flex; flex-wrap: wrap;
	gap: 0.7rem 1rem; align-items: center; }
.interruptor { display: inline-flex; border: 1px solid var(--linha); border-radius: 999px;
	padding: 2px; background: var(--superficie); }
.interruptor button { font: 600 0.82rem/1 var(--titulo); padding: 0.45rem 0.9rem;
	border: 0; border-radius: 999px; background: none; color: var(--tinta-2); cursor: pointer; }
.interruptor button[aria-pressed="true"] { background: var(--marca); color: var(--superficie); }
.controlo .medida { margin-left: auto; }

/* ── um componente ───────────────────────────────────────────────────── */
.familia-seccao { margin-bottom: 2.4rem; }
.familia-titulo { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.1em;
	color: var(--tinta-3); font-weight: 600; margin-bottom: 0.8rem;
	display: flex; align-items: center; gap: 0.5rem; }
.familia-titulo::after { content: ""; flex: 1; height: 1px; background: var(--linha); }
.familia-titulo span { font-family: var(--codigo); font-size: 0.72rem; color: var(--tinta-3);
	order: 3; }
.comp { background: var(--superficie); border: 1px solid var(--linha); border-radius: 10px;
	padding: 1.2rem; margin-bottom: 1rem; display: grid; gap: 1.2rem;
	grid-template-columns: minmax(0, 20rem) minmax(0, 1fr); align-items: start;
	scroll-margin-top: 5rem; }
.comp > header { display: grid; gap: 0.5rem; min-width: 0; }
.identidade { display: flex; align-items: baseline; gap: 0.5rem; flex-wrap: wrap; }
.identidade .cod { font-size: 0.8rem; font-weight: 600; color: var(--marca); }
.oque { font-size: 0.93rem; color: var(--tinta-2); }
.meta { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 0.15rem 0.6rem;
	margin: 0; font-size: 0.8rem; }
.meta dt { font-family: var(--titulo); font-weight: 500; font-size: 0.68rem;
	text-transform: uppercase; letter-spacing: 0.06em; color: var(--tinta-3);
	padding-top: 0.2rem; white-space: nowrap; }
.meta dd { margin: 0; color: var(--tinta-2); overflow-wrap: anywhere; }
.partes { display: flex; flex-wrap: wrap; gap: 0.25rem; align-items: center; }
.partes .etiqueta { font-family: var(--titulo); font-weight: 500; font-size: 0.66rem;
	text-transform: uppercase; letter-spacing: 0.06em; color: var(--tinta-3);
	margin-right: 0.15rem; }
.partes span:not(.etiqueta) { font-family: var(--codigo); font-size: 0.7rem;
	background: var(--marca-fraca); color: var(--marca); padding: 0.12rem 0.4rem;
	border-radius: 4px; }
.porque { font-size: 0.85rem; color: var(--tinta-2); border-left: 2px solid var(--linha);
	padding-left: 0.7rem; }
.sem-captura { font-size: 0.85rem; color: var(--tinta-3); font-style: italic; }

.estados { display: flex; flex-wrap: wrap; gap: 1rem; align-items: start; min-width: 0; }
.estado { margin: 0; display: grid; gap: 0.4rem; min-width: 0; max-width: 100%; }
.estado figcaption { display: flex; align-items: baseline; gap: 0.5rem; flex-wrap: wrap; }
.estado .rotulo { font-family: var(--titulo); font-weight: 600; font-size: 0.8rem; }
.estado .medida { font-family: var(--codigo); font-size: 0.7rem; color: var(--tinta-3); }
.forjado { font-family: var(--codigo); font-size: 0.66rem; text-transform: uppercase;
	letter-spacing: 0.05em; background: var(--alerta-fraco); color: var(--alerta);
	padding: 0.1rem 0.35rem; border-radius: 3px; }
.palco { background: var(--palco); border: 1px solid var(--linha-fraca); border-radius: 8px;
	overflow: auto; max-width: 100%; width: fit-content; padding: 16px; }
.palco.alto { max-height: 420px; }
.palco img { display: block; max-width: 100%; height: auto; }
.nota-estado { font-size: 0.8rem; color: var(--tinta-2); max-width: 44ch; }
.nota-estado.forjada { color: var(--alerta); }
@media (max-width: 900px) { .comp { grid-template-columns: minmax(0, 1fr); } }

/* ── tokens ──────────────────────────────────────────────────────────── */
.grupos { display: grid; gap: 1.6rem;
	grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem), 1fr)); }
.grupo { min-width: 0; }
.grupo h4 { margin-bottom: 0.4rem; }
.legenda { font-size: 0.85rem; color: var(--tinta-2); margin-bottom: 0.6rem; }
.tabela-rolante { overflow-x: auto; }
table.tokens { border-collapse: collapse; width: 100%; font-size: 0.84rem; }
table.tokens th, table.tokens td { text-align: left; padding: 0.3rem 0.5rem 0.3rem 0;
	border-bottom: 1px solid var(--linha-fraca); white-space: nowrap; }
table.tokens thead th { font-family: var(--titulo); font-weight: 500; font-size: 0.72rem;
	text-transform: uppercase; letter-spacing: 0.07em; color: var(--tinta-3); }
table.tokens th[scope="row"] { font-weight: 400; }
.pastilha { display: inline-block; width: 1rem; height: 1rem; border-radius: 3px;
	border: 1px solid rgba(128,128,128,.35); vertical-align: -0.2rem; margin-right: 0.4rem; }
.igual { color: var(--tinta-3); font-size: 0.8rem; }
.escala { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.55rem; }
.escala li { display: flex; align-items: baseline; gap: 0.8rem; flex-wrap: wrap; min-width: 0; }
.exemplo { white-space: nowrap; }
.medida { font-size: 0.78rem; color: var(--tinta-3); font-family: var(--codigo); }
.barra { display: inline-block; height: 0.75rem; background: var(--marca); border-radius: 2px; }
.caixa { display: inline-block; width: 2.4rem; height: 1.5rem; background: var(--marca-fraca);
	border: 1px solid var(--marca); }
.paleta { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.5rem; }
.paleta li { display: flex; align-items: center; gap: 0.7rem; flex-wrap: wrap; }
.par { display: inline-flex; border-radius: 4px; overflow: hidden;
	border: 1px solid rgba(128,128,128,.35); }
.par span { width: 1.35rem; height: 1.35rem; }

/* ── ícones, crachás, ecrãs ──────────────────────────────────────────── */
.icones, .crachas { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.6rem;
	grid-template-columns: repeat(auto-fill, minmax(6.4rem, 1fr)); }
.icones li, .crachas li { display: grid; justify-items: center; gap: 0.4rem;
	padding: 0.8rem 0.3rem; background: var(--superficie); border: 1px solid var(--linha);
	border-radius: 8px; text-align: center; min-width: 0; }
.icones a, .crachas code { font-size: 0.7rem; color: var(--tinta-2); overflow-wrap: anywhere; }
.icones a { text-decoration: none; }
.icones a:hover code { text-decoration: underline; }
.desenho { color: var(--tinta); display: grid; place-items: center; height: 26px; }

.galeria { display: grid; gap: 1.2rem; }
.ecra { background: var(--superficie); border: 1px solid var(--linha); border-radius: 10px;
	padding: 1.1rem; display: grid; gap: 1.1rem; align-items: start;
	grid-template-columns: minmax(0, 1fr) 375px; }
.ecra > header { display: grid; grid-template-columns: 2.3rem minmax(0, 1fr); gap: 0.7rem;
	align-items: start; min-width: 0; }
.num { font-family: var(--titulo); font-weight: 700; font-size: 1.5rem; color: var(--linha);
	font-variant-numeric: tabular-nums; line-height: 1; }
.ecra h4 { font-size: 1rem; text-transform: none; letter-spacing: -0.01em;
	color: var(--tinta); font-weight: 700; margin-bottom: 0.3rem; }
.nota { color: var(--tinta-2); font-size: 0.9rem; }
.ficheiro { margin-top: 0.5rem; font-size: 0.74rem; color: var(--tinta-3);
	font-family: var(--codigo); }
.telemovel { width: 375px; max-width: 100%; height: 600px; overflow-y: auto;
	overflow-x: hidden; border: 1px solid var(--linha); border-radius: 14px;
	background: var(--papel); justify-self: end; }
.telemovel img { display: block; width: 100%; height: auto; }
@media (max-width: 900px) {
	.ecra { grid-template-columns: minmax(0, 1fr); }
	.telemovel { justify-self: start; height: 540px; }
}

/* ── devolver ────────────────────────────────────────────────────────── */
.devolver { display: grid; gap: 1rem; }
.volta { background: var(--superficie); border: 1px solid var(--linha); border-radius: 8px;
	padding: 1rem 1.1rem; display: grid; gap: 0.5rem; min-width: 0; }
.volta h3 { font-size: 1rem; }
.volta p { font-size: 0.9rem; color: var(--tinta-2); }
.volta dl { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 0.2rem 0.7rem;
	margin: 0.2rem 0 0; font-size: 0.84rem; }
.volta dt { font-family: var(--titulo); font-weight: 500; font-size: 0.72rem;
	text-transform: uppercase; letter-spacing: 0.06em; color: var(--tinta-3);
	padding-top: 0.15rem; white-space: nowrap; }
.volta dd { margin: 0; font-family: var(--codigo); font-size: 0.8rem; overflow-wrap: anywhere; }
.volta dd.prosa { font-family: var(--corpo); font-size: 0.88rem; color: var(--tinta-2); }
.ordem { counter-reset: passo; list-style: none; padding: 0; margin: 0; display: grid;
	gap: 0.7rem; }
.ordem li { counter-increment: passo; display: grid; grid-template-columns: 1.6rem 1fr;
	gap: 0.7rem; align-items: baseline; }
.ordem li::before { content: counter(passo); font-family: var(--titulo); font-weight: 700;
	color: var(--marca); font-variant-numeric: tabular-nums; }

footer { padding-block: 2rem; color: var(--tinta-3); font-size: 0.84rem; }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
</style>

<div class="envelope">

<header class="capa">
	<span class="sobrescrito">Para quem vai desenhar</span>
	<h1>Os componentes<br>do ${e(PRODUTO.nome)}</h1>
	<p class="intro">${COMPONENTES.length} componentes com nome e número, cada um fotografado
		sozinho, em cada um dos seus estados e nos dois temas. Com o que é fixo, o que é livre,
		e como é que cada peça volta para dentro da app.</p>
	<p class="carimbo">
		<span>versão ${e(versao)}</span>
		<span>${e(data)}</span>
		<span>dados reais de ${e(indiceComp.dia)}</span>
		<span>${COMPONENTES.length} componentes · ${totalEstados} estados · ${icones.length} ícones</span>
	</p>
</header>

<section class="bloco">
	<div class="mudou">
		<h2>${e(PORQUE_MUDOU.titulo)}</h2>
		<p>${PORQUE_MUDOU.texto}</p>
	</div>
</section>

<section class="bloco">
	<h2>O que é o ${e(PRODUTO.nome)}</h2>
	<p class="subtitulo">${e(PRODUTO.emUmaLinha)} Está no ar em <strong>${e(PRODUTO.endereco)}</strong>.</p>
	<div class="grupos">
		<div class="grupo">
			<h4>Quem o usa, e onde</h4>
			<ul class="simples">${PRODUTO.quemUsa.map((x) => `<li>${e(x)}</li>`).join('')}</ul>
		</div>
		<div class="grupo">
			<h4>O que não é</h4>
			<ul class="simples">${PRODUTO.naoE.map((x) => `<li>${e(x)}</li>`).join('')}</ul>
		</div>
	</div>
</section>

<section class="bloco">
	<h2>O que não se mexe</h2>
	<p class="subtitulo">Não é teimosia: cada uma destas destrava-se com um custo concreto, e
		todas têm um teste a vigiá-las. Um desenho que as ignore não chega a entrar.</p>
	<ul class="regras">
		${FIXO.map((r) => `<li><strong>${e(r.regra)}</strong><span>${e(r.porque)}</span></li>`).join('')}
	</ul>
</section>

<section class="bloco">
	<h2>O que é teu</h2>
	<ul class="simples">${LIVRE.map((x) => `<li>${e(x)}</li>`).join('')}</ul>
</section>

<section class="bloco">
	<h2>Os ${COMPONENTES.length} componentes</h2>
	<p class="subtitulo">Cada um tem um número que não muda — <code>C09</code> é sempre a linha
		de jogo. É por esse número que falamos dele, que o devolves, e que eu o substituo.
		Os <strong>estados</strong> são as situações em que o mesmo componente tem de funcionar;
		os marcados como <em>forçado</em> não existiam nos dados do dia e foram encenados para a
		captura.</p>
	<div class="indice">${indiceRapido}</div>
</section>

<section class="bloco">
	<div class="controlo">
		<span class="interruptor" role="group" aria-label="Tema das capturas">
			<button type="button" id="btClaro" aria-pressed="true">Claro</button>
			<button type="button" id="btEscuro" aria-pressed="false">Escuro</button>
		</span>
		<span class="medida">375 px de largura · dupla densidade</span>
	</div>
	${catalogo}
</section>

<section class="bloco">
	<h2>C32 · Os ${icones.length} ícones</h2>
	<p class="subtitulo">Todos numa grelha de 20×20, traço de 1,8, pontas e juntas redondas, e a
		cor vem de fora por <code>currentColor</code>. São o trabalho mais fácil de integrar que
		há aqui: colam-se um a um, sem tocar em mais nada.
		<strong>Toca no nome para abrir o ficheiro</strong> — também te chegam os 26 numa pasta.</p>
	<ul class="icones">${grelhaDeIcones}</ul>
</section>

<section class="bloco">
	<h2>C25 · Os ${escaloes.length} crachás de escalão</h2>
	<p class="subtitulo">Já são SVG nossos e aparecem a 18&nbsp;px no placar do jogo e grandes no
		menu de competições. Têm de se ler nos dois tamanhos.</p>
	<ul class="crachas">${grelhaDeEscaloes}</ul>
	<div class="grupos" style="margin-top:1.8rem">
		<div class="grupo">
			<h4>Emblemas dos clubes</h4>
			<p class="legenda">Não são nossos — vêm da associação, são 31 WebP de 64&nbsp;px, e
				aparecem a 18–32&nbsp;px. Não se redesenham. O que é nosso é o recuo do C24: uma equipa
				sem emblema ganha um círculo com as iniciais, de cor estável pelo nome.</p>
		</div>
		<div class="grupo">
			<h4>O ícone da aplicação — provisório desde o primeiro dia</h4>
			<p class="legenda">O que lá está foi <strong>desenhado por um script em Python</strong>: um
				stick branco sobre amarelo torrado, a traços. Sempre foi um lugar reservado. É uma peça
				só, não depende de mais nada, e é a primeira coisa que te sugiro.</p>
			<ul class="crachas" style="grid-template-columns:repeat(auto-fill,minmax(7rem,1fr))">
				<li><img src="app-192.png" alt="O ícone actual da aplicação" width="64" height="64" /><code>icone-192</code></li>
				<li><img src="app-maskable.png" alt="O ícone actual, versão recortável" width="64" height="64" /><code>maskable</code></li>
			</ul>
		</div>
	</div>
</section>

<section class="bloco">
	<h2>As cores, as letras e as medidas</h2>
	<p class="subtitulo">Isto não foi copiado para aqui à mão — é lido do código de cada vez que
		esta página se gera, e por isso não pode estar desactualizado. Cada cor tem um valor no
		claro e outro no escuro.</p>
	<div class="grupos">
		${grupoDeCores('Superfícies e texto', ['--fundo', '--cartao', '--texto', '--texto-2', '--suave', '--borda', '--borda-fraca'])}
		${grupoDeCores('Sinais', ['--acento', '--acento-fraco', '--vivo', '--directo', '--terminado', '--aviso', '--aviso-fundo', '--estrela'], 'O <code>--vivo</code> é "a acontecer agora", o <code>--directo</code> é "dá para ver", o <code>--terminado</code> é "acabou". Nunca aparecem a dizer outra coisa.')}
		${grupoDeCores('O placar do jogo', ['--heroi', '--heroi-texto', '--heroi-suave', '--heroi-borda'], 'Era quase preto, e os emblemas de contorno escuro desapareciam lá dentro.')}
	</div>
	<div class="grupos" style="margin-top:1.8rem">
		<div class="grupo">
			<h4>Escala de texto — seis degraus, e nenhum entre eles</h4>
			<ul class="escala">${escalaDeTexto}</ul>
		</div>
		<div class="grupo">
			<h4>Espaçamento — base de 4&nbsp;px</h4>
			<p class="legenda">Há um 6&nbsp;px porque numa lista densa o 4 é pouco e o 8 é demasiado.
				Sem esse degrau voltar-se-ia a inventar números.</p>
			<ul class="escala">${escalaDeEspaco}</ul>
			<h4 style="margin-top:1.2rem">Cantos</h4>
			<ul class="escala">${raios}</ul>
		</div>
		<div class="grupo">
			<h4>As seis cores de acento à escolha</h4>
			<p class="legenda">Quem usa a app escolhe a cor do clube. Muda <strong>só o acento</strong>.
				Cada uma tem um valor para o claro e outro para o escuro.</p>
			<ul class="paleta">${paleta}</ul>
		</div>
	</div>
</section>

<section class="bloco">
	<h2>Como me devolves o trabalho</h2>
	<p class="subtitulo">Esta é a parte que decide se uma entrega entra na app em minutos ou se
		alguém a tem de redesenhar em código. Ficheiros que respeitem isto entram sem retoque.</p>
	<div class="devolver">
		${DEVOLVER.map(
			(d) => `<div class="volta">
			<h3>${e(d.o)}</h3>
			<p>${d.como}</p>
			<dl>
				<dt>onde assenta</dt><dd>${e(d.onde)}</dd>
				<dt>o que faço</dt><dd class="prosa">${d.depois}</dd>
			</dl>
		</div>`
		).join('')}
	</div>
	<h4 style="margin-top:1.8rem">O que não entra</h4>
	<ul class="recusa" style="margin-top:0.6rem">
		${NAO_ENTREGUES.map(([o, porque]) => `<li><span><strong>${e(o)}</strong> <em>${e(porque)}</em></span></li>`).join('')}
	</ul>
</section>

<section class="bloco">
	<h2>Por onde começar</h2>
	<p class="subtitulo">Uma peça de cada vez, vista na app antes da seguinte.</p>
	<ol class="ordem">${RITMO.map((x) => `<li><span>${x}</span></li>`).join('')}</ol>
</section>

<section class="bloco" style="border-bottom:0">
	<h2>Onde é que as peças encaixam</h2>
	<p class="subtitulo">Os ${ecras.length} ecrãs da aplicação, inteiros. Não são para desenhar —
		são para perceberes o que é que um componente parte quando muda, e quanta coisa há num
		ecrã ao mesmo tempo. Cada moldura tem a largura real de um telemóvel pequeno e desliza
		por dentro. A linha vermelha marca os 812&nbsp;px, onde o telemóvel corta.</p>
	<div class="galeria">${galeriaEcras}</div>
</section>

<footer>
	Gerado a partir do código da aplicação, versão ${e(versao)}. As cores, as medidas, a lista de
	ícones e a de crachás são lidas dos ficheiros — não há aqui nada copiado à mão que possa
	estar errado. As capturas são de ${e(data)}, com os dados publicados de ${e(indiceComp.dia)}.
	${comEstados.length} dos ${COMPONENTES.length} componentes têm captura; os outros estão
	explicados na sua nota.
</footer>

</div>

<script>
	// Um interruptor só, para as capturas de componente e as dos ecrãs ao mesmo tempo. Duas
	// imagens por estado e não uma com o endereço trocado: assim a segunda já está no browser
	// e a troca é instantânea em vez de um piscar branco por cada uma das capturas.
	const btClaro = document.getElementById('btClaro');
	const btEscuro = document.getElementById('btEscuro');
	function mostrar(tema) {
		const escuro = tema === 'escuro';
		for (const i of document.querySelectorAll('.tema-claro')) i.hidden = escuro;
		for (const i of document.querySelectorAll('.tema-escuro')) i.hidden = !escuro;
		btClaro.setAttribute('aria-pressed', String(!escuro));
		btEscuro.setAttribute('aria-pressed', String(escuro));
		try { localStorage.setItem('catalogo:tema', tema); } catch {}
	}
	btClaro.addEventListener('click', () => mostrar('claro'));
	btEscuro.addEventListener('click', () => mostrar('escuro'));
	try { if (localStorage.getItem('catalogo:tema') === 'escuro') mostrar('escuro'); } catch {}
</script>
`;

writeFileSync(join(CAPTURAS, 'catalogo.html'), pagina);
console.log(
	`catalogo.html — ${COMPONENTES.length} componentes, ${totalEstados} estados, ` +
		`${icones.length} ícones, ${escaloes.length} crachás, ${ecras.length} ecrãs`
);
