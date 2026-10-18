/**
 * Monta a página do catálogo a partir das capturas, dos ícones e dos *tokens* lidos do código.
 *
 *     node scripts/catalogo/capturar.mjs        # as 50 imagens
 *     node scripts/catalogo/exportar_icones.mjs # os 26 SVG
 *     node scripts/catalogo/gerar_pagina.mjs    # a página
 *
 * A página sai em `capturas/catalogo.html` e é publicada como Artifact, com a pasta das
 * capturas ao lado. Nada disto é commitado: refaz-se em três comandos, e um catálogo
 * commitado é uma cópia a envelhecer ao lado do código que ele descreve.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { lerTokens, lerCores, lerVersao, lerEscaloes } from './tokens.mjs';
import { PRODUTO, FIXO, LIVRE, NAO_ENTREGUES, DEVOLVER, RITMO } from './conteudo.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const CAPTURAS = join(AQUI, 'capturas');
const ICONES = join(AQUI, 'icones');

const e = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const indice = JSON.parse(readFileSync(join(CAPTURAS, 'indice.json'), 'utf8'));
const { claro, escuro } = lerTokens();
const cores = lerCores();
const versao = lerVersao();
const escaloes = lerEscaloes();

/** Os ecrãs, um por id, com as duas capturas juntas. */
const ecras = [];
for (const c of indice.ecras) {
	let ecra = ecras.find((x) => x.id === c.id);
	if (!ecra) ecras.push((ecra = { ...c, capturas: {} }));
	ecra.capturas[c.tema] = c;
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

const data = new Date(indice.tirado_em).toLocaleDateString('pt-PT', {
	day: '2-digit', month: 'long', year: 'numeric'
});

// ── as peças ───────────────────────────────────────────────────────────────────────────

const amostra = (nome, valorClaro, valorEscuro) => `
	<tr>
		<th scope="row"><code>${e(nome)}</code></th>
		<td><span class="pastilha" style="background:${e(valorClaro)}"></span><code>${e(valorClaro)}</code></td>
		<td>${
			valorEscuro
				? `<span class="pastilha escuro" style="background:${e(valorEscuro)}"></span><code>${e(valorEscuro)}</code></td>`
				: '<span class="igual">igual</span></td>'
		}
	</tr>`;

const grupoDeCores = (titulo, nomes, legenda) => `
	<div class="grupo">
		<h4>${e(titulo)}</h4>
		${legenda ? `<p class="legenda">${legenda}</p>` : ''}
		<div class="tabela-rolante"><table class="tokens">
			<thead><tr><th>token</th><th>claro</th><th>escuro</th></tr></thead>
			<tbody>${nomes
				.filter((n) => claro.has(n))
				.map((n) => amostra(n, claro.get(n).replace(/var\([^,]+,\s*/, '').replace(/\)$/, ''), escuro.has(n) ? escuro.get(n).replace(/var\([^,]+,\s*/, '').replace(/\)$/, '') : null))
				.join('')}</tbody>
		</table></div>
	</div>`;

const escalaDeTexto = [...claro]
	.filter(([n]) => n.startsWith('--t-'))
	.map(([n, v]) => {
		const px = Math.round(parseFloat(v) * 16);
		const comentario = (claro.get(`${n}__nota`) ?? '').toString();
		return `<li>
			<span class="exemplo" style="font-size:${e(v)}">CD PAÇO ARCOS 3 – 2 AE FISICA</span>
			<span class="medida"><code>${e(n)}</code> · ${px} px${comentario}</span>
		</li>`;
	})
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

const galeria = ecras
	.map(
		(x, i) => `
	<article class="ecra" id="ecra-${e(x.id)}">
		<header>
			<span class="num">${String(i + 1).padStart(2, '0')}</span>
			<div>
				<h3>${e(x.titulo)}</h3>
				<p class="nota">${e(x.nota)}</p>
				<p class="pecas">${x.mostra.map((m) => `<span>${e(m)}</span>`).join('')}</p>
				<p class="ficheiro"><code>${e(x.id)}</code> · ${x.capturas.claro.largura}×${x.capturas.claro.altura}</p>
			</div>
		</header>
		<div class="telemovel">
			<img class="tema-claro" src="${e(x.capturas.claro.ficheiro)}" alt="${e(x.titulo)}, tema claro" loading="lazy" />
			<img class="tema-escuro" src="${e(x.capturas.escuro.ficheiro)}" alt="${e(x.titulo)}, tema escuro" loading="lazy" hidden />
		</div>
	</article>`
	)
	.join('');

// O nome é uma ligação ao próprio SVG, publicado ao lado desta página: abre numa aba e
// dali guarda-se. É o mais perto de um "descarregar" que uma página destas consegue.
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

const pagina = `<meta name="claude:viewport-fit-sides" content="cover">
<title>Catálogo OK4Sticks</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;700&display=swap">
<style>
/* Duas colunas quando cabe: o ecrã à esquerda, o que ele mostra à direita. Numa coluna
   abaixo de 860px. Os tokens abaixo são os do catálogo, não os da app — os da app estão
   na página, lidos do código. */
:root {
	--papel: #fbfaf7;
	--superficie: #ffffff;
	--tinta: #16191d;
	--tinta-2: #565e68;
	--tinta-3: #8b939d;
	--linha: #e4e2dc;
	--linha-fraca: #eeece7;
	--marca: #0a7d54;
	--marca-fraca: #e9f3ef;
	--alerta: #9a3412;
	--alerta-fraco: #fdf0e7;
	--titulo: Archivo, "Helvetica Neue", Arial, sans-serif;
	--corpo: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
	--codigo: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
}
@media (prefers-color-scheme: dark) {
	:root:not([data-theme="light"]) {
		--papel: #121316; --superficie: #1a1d21; --tinta: #e9eaec; --tinta-2: #b0b6bd;
		--tinta-3: #848b93; --linha: #2b2f35; --linha-fraca: #22262b;
		--marca: #34d399; --marca-fraca: #13241e;
		--alerta: #fbbf7a; --alerta-fraco: #2a1d12;
		color-scheme: dark;
	}
}
:root[data-theme="dark"] {
	--papel: #121316; --superficie: #1a1d21; --tinta: #e9eaec; --tinta-2: #b0b6bd;
	--tinta-3: #848b93; --linha: #2b2f35; --linha-fraca: #22262b;
	--marca: #34d399; --marca-fraca: #13241e;
	--alerta: #fbbf7a; --alerta-fraco: #2a1d12;
	color-scheme: dark;
}

*, *::before, *::after { box-sizing: border-box; }
body { background: var(--papel); color: var(--tinta); font-family: var(--corpo);
	font-size: 15px; line-height: 1.6; }
.envelope { max-width: 70rem; margin: 0 auto;
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

/* ── cabeçalho ───────────────────────────────────────────────────────── */
.capa { display: flex; flex-direction: column; gap: 1.1rem; padding-block: 3rem 2.5rem;
	border-bottom: 2px solid var(--tinta); }
.sobrescrito { font-family: var(--titulo); font-weight: 500; font-size: 0.78rem;
	text-transform: uppercase; letter-spacing: 0.14em; color: var(--marca); }
.capa p.intro { font-size: 1.08rem; color: var(--tinta-2); max-width: 46ch; }
.carimbo { display: flex; flex-wrap: wrap; gap: 0.4rem 1.2rem; font-size: 0.8rem;
	color: var(--tinta-3); font-family: var(--codigo); }

section { padding-block: 2.6rem; border-bottom: 1px solid var(--linha); }
section > h2 { margin-bottom: 0.3rem; }
section > .subtitulo { color: var(--tinta-2); margin-bottom: 1.6rem; max-width: 60ch; }

/* ── listas de regras ────────────────────────────────────────────────── */
.regras { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.9rem;
	grid-template-columns: repeat(auto-fit, minmax(min(100%, 19rem), 1fr)); }
.regras li { background: var(--superficie); border: 1px solid var(--linha);
	border-left: 3px solid var(--marca); border-radius: 0 6px 6px 0; padding: 0.9rem 1.1rem;
	min-width: 0; }
.regras strong { display: block; font-family: var(--titulo); font-size: 0.97rem;
	margin-bottom: 0.3rem; }
.regras span { font-size: 0.88rem; color: var(--tinta-2); }

.simples { margin: 0; padding-left: 1.1rem; display: grid; gap: 0.35rem; color: var(--tinta-2); }
.simples strong { color: var(--tinta); }

.recusa { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.5rem; }
.recusa li { display: grid; grid-template-columns: 1.2rem 1fr; gap: 0.6rem;
	align-items: baseline; font-size: 0.92rem; }
.recusa li::before { content: "×"; color: var(--alerta); font-weight: 700; font-size: 1.1rem; }
.recusa em { font-style: normal; color: var(--tinta-2); }

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
.exemplo { font-family: var(--corpo); white-space: nowrap; }
.medida { font-size: 0.78rem; color: var(--tinta-3); font-family: var(--codigo); }
.barra { display: inline-block; height: 0.75rem; background: var(--marca); border-radius: 2px; }
.caixa { display: inline-block; width: 2.4rem; height: 1.5rem; background: var(--marca-fraca);
	border: 1px solid var(--marca); }
.paleta { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.5rem; }
.paleta li { display: flex; align-items: center; gap: 0.7rem; flex-wrap: wrap; }
.par { display: inline-flex; border-radius: 4px; overflow: hidden;
	border: 1px solid rgba(128,128,128,.35); }
.par span { width: 1.35rem; height: 1.35rem; }

/* ── galeria ─────────────────────────────────────────────────────────── */
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

.galeria { display: grid; gap: 1.6rem; }
/* A coluna da moldura é fixa em 375px, e nunca "auto": medido a 18/10/2026, com uma coluna
   automática o browser mede o conteudo maximo da imagem — 750px, por ser de dupla densidade
   — e dava a moldura 752px, esmagando a coluna do texto para 169px. */
.ecra { background: var(--superficie); border: 1px solid var(--linha); border-radius: 10px;
	padding: 1.1rem; display: grid; gap: 1.1rem; align-items: start;
	grid-template-columns: minmax(0, 1fr) 375px; }
.ecra > header { display: grid; grid-template-columns: 2.3rem minmax(0, 1fr); gap: 0.7rem;
	align-items: start; min-width: 0; }
.num { font-family: var(--titulo); font-weight: 700; font-size: 1.5rem; color: var(--linha);
	font-variant-numeric: tabular-nums; line-height: 1; }
.ecra h3 { margin-bottom: 0.3rem; }
.nota { color: var(--tinta-2); font-size: 0.92rem; }
.pecas { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-top: 0.6rem; }
.pecas span { font-family: var(--codigo); font-size: 0.72rem; background: var(--marca-fraca);
	color: var(--marca); padding: 0.15rem 0.45rem; border-radius: 4px; }
.ficheiro { margin-top: 0.5rem; font-size: 0.74rem; color: var(--tinta-3);
	font-family: var(--codigo); }
.telemovel { width: 375px; max-width: 100%; height: 640px; overflow-y: auto; overflow-x: hidden;
	border: 1px solid var(--linha); border-radius: 14px; background: var(--papel);
	justify-self: end; }
.telemovel img { display: block; width: 100%; height: auto; }
@media (max-width: 900px) {
	.ecra { grid-template-columns: minmax(0, 1fr); }
	.telemovel { justify-self: start; height: 560px; }
}

/* ── ícones e crachás ────────────────────────────────────────────────── */
.icones, .crachas { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.6rem;
	grid-template-columns: repeat(auto-fill, minmax(6.4rem, 1fr)); }
.icones li, .crachas li { display: grid; justify-items: center; gap: 0.4rem;
	padding: 0.8rem 0.3rem; background: var(--superficie); border: 1px solid var(--linha);
	border-radius: 8px; text-align: center; min-width: 0; }
.icones a { text-decoration: none; }
.icones a:hover code, .icones a:focus-visible code { text-decoration: underline; }
.icones a, .crachas code { font-size: 0.7rem; color: var(--tinta-2);
	overflow-wrap: anywhere; }
.desenho { color: var(--tinta); display: grid; place-items: center; height: 26px; }

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
	<h1>Catálogo de componentes<br>do ${e(PRODUTO.nome)}</h1>
	<p class="intro">Todos os ecrãs da aplicação, nos dois temas, à medida real de um telemóvel.
		Com o que é fixo, o que é livre, e como é que o teu trabalho entra na app sem ser redesenhado.</p>
	<p class="carimbo">
		<span>versão ${e(versao)}</span>
		<span>capturas de ${e(data)}</span>
		<span>dados reais de ${e(indice.dia)}</span>
		<span>${ecras.length} ecrãs · ${icones.length} ícones · ${escaloes.length} crachás</span>
	</p>
</header>

<section>
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

<section>
	<h2>O que não se mexe</h2>
	<p class="subtitulo">Não é teimosia: cada uma destas destrava-se com um custo concreto, e
		todas têm um teste a vigiá-las. Um desenho que as ignore não chega a entrar.</p>
	<ul class="regras">
		${FIXO.map((r) => `<li><strong>${e(r.regra)}</strong><span>${e(r.porque)}</span></li>`).join('')}
	</ul>
</section>

<section>
	<h2>O que é teu</h2>
	<ul class="simples">${LIVRE.map((x) => `<li>${e(x)}</li>`).join('')}</ul>
</section>

<section>
	<h2>As cores, as letras e as medidas</h2>
	<p class="subtitulo">Isto não foi copiado para aqui à mão — é lido do código de cada vez que
		esta página se gera, e por isso não pode estar desactualizado. Cada cor tem um valor no
		claro e outro no escuro.</p>
	<div class="grupos">
		${grupoDeCores('Superfícies e texto', ['--fundo', '--cartao', '--texto', '--texto-2', '--suave', '--borda', '--borda-fraca'])}
		${grupoDeCores('Sinais', ['--acento', '--acento-fraco', '--vivo', '--directo', '--terminado', '--aviso', '--aviso-fundo', '--estrela'], 'O <code>--vivo</code> é "a acontecer agora", o <code>--directo</code> é "dá para ver", o <code>--terminado</code> é "acabou". Nunca aparecem a dizer outra coisa.')}
		${grupoDeCores('O herói da ficha de jogo', ['--heroi', '--heroi-texto', '--heroi-suave', '--heroi-borda'], 'Era quase preto, e os emblemas de contorno escuro desapareciam lá dentro.')}
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

<section>
	<h2>Os ${ecras.length} ecrãs</h2>
	<p class="subtitulo">Cada moldura tem a largura real de um telemóvel pequeno e desliza por
		dentro — o que vês é o ecrã inteiro, não um recorte. A linha vermelha marca os 812&nbsp;px:
		é aí que o telemóvel corta. A barra de baixo está sempre à vista na app; aqui foi posta
		no fim da imagem para não atravessar o conteúdo.</p>
	<div class="controlo">
		<span class="interruptor" role="group" aria-label="Tema das capturas">
			<button type="button" id="btClaro" aria-pressed="true">Claro</button>
			<button type="button" id="btEscuro" aria-pressed="false">Escuro</button>
		</span>
		<span class="medida">375 × 812 · dupla densidade</span>
	</div>
	<div class="galeria">${galeria}</div>
</section>

<section>
	<h2>Os ${icones.length} ícones</h2>
	<p class="subtitulo">Todos numa grelha de 20×20, traço de 1,8, pontas e juntas redondas, e a
		cor vem de fora por <code>currentColor</code>. São o trabalho mais fácil de integrar que
		há aqui: colam-se um a um, sem tocar em mais nada.</p>
	<p class="subtitulo"><strong>Toca no nome para abrir o ficheiro</strong> e guardá-lo. Também
		te chegam os 26 numa pasta, para não teres de os ir buscar um a um.</p>
	<ul class="icones">${grelhaDeIcones}</ul>
</section>

<section>
	<h2>Os ${escaloes.length} crachás de escalão</h2>
	<p class="subtitulo">Já são SVG nossos e aparecem a 18&nbsp;px na barra do jogo e grandes no
		menu de competições. Têm de se ler nos dois tamanhos.</p>
	<ul class="crachas">${grelhaDeEscaloes}</ul>
	<div class="grupos" style="margin-top:1.8rem">
		<div class="grupo">
			<h4>Emblemas dos clubes</h4>
			<p class="legenda">Não são nossos — vêm da associação, são 31 WebP de 64&nbsp;px, e
				aparecem a 22–32&nbsp;px. Não se redesenham. O que é nosso é o recuo: uma equipa sem
				emblema ganha um círculo com as iniciais, de cor estável pelo nome. Esse pode ser
				redesenhado.</p>
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

<section>
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

<section style="border-bottom:0">
	<h2>Por onde começar</h2>
	<p class="subtitulo">O pedido original falava em <em>alterações progressivas</em>, e é assim
		que isto corre melhor: uma peça de cada vez, vista na app antes da seguinte.</p>
	<ol class="ordem">${RITMO.map((x) => `<li><span>${x}</span></li>`).join('')}</ol>
</section>

<footer>
	Gerado a partir do código da aplicação, versão ${e(versao)}. As cores, as medidas, a lista
	de ícones e a de crachás são lidas dos ficheiros — não há aqui nada copiado à mão que possa
	estar errado. As capturas são de ${e(data)}, com os dados publicados de ${e(indice.dia)}.
</footer>

</div>

<script>
	// O interruptor troca as duas capturas de cada ecrã. Duas imagens por ecrã, e não uma com
	// o endereço trocado: assim a segunda já está no browser quando se carrega, e a troca é
	// instantânea em vez de um piscar branco por cada um dos ${ecras.length} ecrãs.
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
console.log(`catalogo.html — ${ecras.length} ecrãs, ${icones.length} ícones, ${escaloes.length} crachás`);
