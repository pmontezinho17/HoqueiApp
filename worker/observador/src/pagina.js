/**
 * A consola, desenhada para um ecrã de PC.
 *
 * A primeira versão era uma coluna de 44 rem — a largura da app — e num monitor lia-se como
 * um telemóvel esticado. O dono cortou-a: *"quero uma visão de como se fosse a entrar num PC
 * normal"*. E a pergunta dele a seguir foi a que importa: *"onde está a informação de quem
 * usa a aplicação?"*. Estava lá, mas atrás de chaves técnicas — `/clube`, `/jogo` — e debaixo
 * de duas tabelas. Aqui é o primeiro bloco, com os nomes dos ecrãs por extenso.
 *
 * ## Decisões de desenho, e porquê
 *
 * **Números grandes em cima, barras para o uso, tabelas para os eventos.** Um número isolado
 * — "120 aberturas hoje" — não é um gráfico e não deve ser desenhado como um; uma série de
 * sete dias é, e é uma barra por dia. As tabelas ficam para o que é uma lista de
 * acontecimentos com hora: golos, corridas, rondas.
 *
 * **Uma série só, logo sem legenda.** As barras do uso são todas a mesma coisa — aberturas
 * por dia —, e o título diz o que são. Legenda de uma cor é ruído.
 *
 * **Duas cores de estado, e não três.** Verde e laranja. O amarelo entrou e saiu: medido com
 * o validador do `dataviz`, o par laranja/amarelo fica a ΔE 11 no tema escuro, e abaixo de 15
 * nem quem tem visão normal os distingue. O par que ficou passa as verificações nos dois
 * temas — o aviso de "lightness band" no escuro é a verificação pensada para séries
 * categóricas, e aqui o que manda é o contraste, que passa.
 *
 * **O estado nunca é só cor.** Tem palavra ao lado, sempre: "tudo em ordem", "algo está mal".
 * Quem não distingue as duas cores lê a frase.
 */

/** Os nomes dos ecrãs como uma pessoa lhes chama, e não como o endereço os escreve. */
const ECRAS = {
	'/': 'Jogos do dia',
	'/clube': 'O Meu Clube',
	'/competicoes': 'Competições',
	'/equipa': 'Página de equipa',
	'/jogo': 'Ficha de jogo',
	'/mais': 'Sobre a app',
	'/privacidade': 'Privacidade',
	'/procurar': 'Procurar',
	outro: 'Outros'
};

const esc = (x) =>
	String(x ?? '').replace(
		/[&<>"]/g,
		(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]
	);

const diaCurto = (d) => {
	const dias = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
	const x = new Date(`${d}T12:00:00Z`);
	return `${dias[x.getUTCDay()]} ${d.slice(8)}/${d.slice(5, 7)}`;
};

/** Um número grande com a sua etiqueta. Não é um gráfico, e não se desenha como um. */
const painel = (etiqueta, valor, nota = '', classe = '') => `
<div class="painel">
  <span class="etiqueta">${esc(etiqueta)}</span>
  <strong class="${classe}">${valor}</strong>
  ${nota ? `<span class="nota">${nota}</span>` : ''}
</div>`;

/**
 * As barras do uso: uma série, uma cor, extremo arredondado, rótulo directo em cada barra.
 *
 * Rótulo em **todas** e não em algumas porque são sete valores e a barra é a própria tabela —
 * não há outro sítio onde ler o número.
 *
 * **Um dia sem contador não é um dia com zero.** O contador nasceu a 07/10/2026, e desenhar
 * os dias anteriores como barras vazias dizia "ninguém usou a app" quando a verdade é "não
 * estávamos a contar". Esses aparecem sem barra e com um travessão.
 */
function barras(dias) {
	const maximo = Math.max(1, ...dias.map((d) => d.aparelhos));
	return dias
		.map((d) => {
			const semContador = d.semDados || (!d.aparelhos && !d.aberturas);
			const titulo = semContador
				? `${diaCurto(d.dia)}: o contador de aparelhos ainda não existia`
				: `${diaCurto(d.dia)}: ${d.aparelhos} aparelhos (${d.novos} novos), ~${d.aberturas} aberturas`;
			return `
  <div class="barra" title="${esc(titulo)}">
    <span class="dia">${esc(diaCurto(d.dia))}</span>
    <span class="trilho">${
		d.aparelhos ? `<i style="width:${Math.max(2, (100 * d.aparelhos) / maximo)}%"></i>` : ''
	}</span>
    <span class="valor">${
		d.aparelhos
			? `${d.aparelhos}${d.novos ? ` <em title="novos">+${d.novos}</em>` : ''}`
			: '<em title="sem contador de aparelhos">—</em>'
	}</span>
  </div>`;
		})
		.join('');
}

export function pagina({ dia, estado, rel, runs, diario, ent, dias }) {
	const s = estado?.saude;
	const mal = s?.estado === 'vermelho';
	const hoje = ent[dia] ?? {};
	const ecrasHoje = Object.entries(hoje)
		.filter(([k]) => k !== 'aberturas')
		.sort((a, b) => b[1] - a[1]);
	const totalEcras = ecrasHoje.reduce((t, [, v]) => t + v, 0);

	const serie = dias.map((d) => ({
		dia: d,
		semDados: !ent[d],
		aparelhos: ent[d]?.aparelhos ?? 0,
		novos: ent[d]?.novos ?? 0,
		aberturas: ent[d]?.aberturas ?? 0,
		ecras: Object.entries(ent[d] ?? {})
			.filter(([k]) => k !== 'aberturas')
			.reduce((t, [, v]) => t + v, 0)
	}));
	const comDados = serie.filter((d) => d.aparelhos > 0);
	const semana = comDados.reduce((t, d) => t + d.aparelhos, 0);

	const tabela = (linhas, vazio = 'nada ainda') =>
		linhas.length
			? `<table>${linhas.join('')}</table>`
			: `<p class="vazio">${vazio}</p>`;

	return `<!doctype html>
<html lang="pt-PT"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Consola — OK4Sticks</title>
<meta http-equiv="refresh" content="60">
<style>
 :root {
   color-scheme: light dark;
   --fundo:#f5f6f8; --cartao:#fff; --texto:#14171c; --texto2:#4b525c; --suave:#767e8a;
   --borda:#e3e6ea; --borda2:#eef0f3;
   --bem:#0a7d54; --mal:#c2410c; --barra:#0a7d54;
 }
 @media (prefers-color-scheme: dark) {
   :root {
     --fundo:#0f1115; --cartao:#181b21; --texto:#e8eaed; --texto2:#b6bcc5; --suave:#868d98;
     --borda:#272b33; --borda2:#1f232a;
     --bem:#34d399; --mal:#fb923c; --barra:#34d399;
   }
 }
 * { box-sizing:border-box }
 body { margin:0; background:var(--fundo); color:var(--texto);
   font:14px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; padding:24px 28px 56px }
 header { display:flex; align-items:baseline; gap:12px; margin-bottom:18px }
 h1 { font-size:1.1rem; margin:0; letter-spacing:-.01em }
 header .meta { color:var(--suave); font-size:.8rem }
 .grelha { display:grid; gap:16px; grid-template-columns:repeat(12,1fr); max-width:1280px }
 section { background:var(--cartao); border:1px solid var(--borda); border-radius:12px;
   padding:16px 18px; min-width:0 }
 section > h2 { font-size:.7rem; letter-spacing:.07em; text-transform:uppercase;
   color:var(--suave); margin:0 0 12px; font-weight:600 }
 .l12 { grid-column:span 12 } .l8 { grid-column:span 8 } .l6 { grid-column:span 6 }
 .l4 { grid-column:span 4 } .l3 { grid-column:span 3 }
 @media (max-width:1000px) { .l8,.l6,.l4,.l3 { grid-column:span 12 } body { padding:16px } }

 /* o estado: cor **e** palavra, nunca só cor */
 .estado { display:flex; align-items:center; gap:16px; flex-wrap:wrap }
 .farol { width:12px; height:12px; border-radius:50%; flex:0 0 auto;
   background:${mal ? 'var(--mal)' : 'var(--bem)'} }
 .estado b { font-size:1.25rem; letter-spacing:-.01em }
 .estado .porque { color:var(--texto2); font-size:.85rem }
 .estado .porque span { color:var(--mal); font-weight:600 }

 .paineis { display:grid; grid-template-columns:repeat(5,1fr); gap:16px }
 @media (max-width:1200px) { .paineis { grid-template-columns:repeat(3,1fr) } }
 @media (max-width:760px) { .paineis { grid-template-columns:repeat(2,1fr) } }
 .painel { background:var(--cartao); border:1px solid var(--borda); border-radius:12px;
   padding:14px 16px; display:flex; flex-direction:column; gap:2px }
 .painel .etiqueta { font-size:.68rem; letter-spacing:.06em; text-transform:uppercase;
   color:var(--suave); font-weight:600 }
 .painel strong { font-size:1.9rem; font-variant-numeric:tabular-nums; letter-spacing:-.02em;
   line-height:1.15 }
 .painel strong.mal { color:var(--mal) }
 .painel .nota { font-size:.74rem; color:var(--suave) }

 /* uso: uma série, uma cor, extremo arredondado, rótulo directo */
 .barra { display:grid; grid-template-columns:5.5rem 1fr 3.2rem; align-items:center; gap:10px;
   padding:3px 0 }
 .barra .dia { font-size:.78rem; color:var(--texto2) }
 .barra .trilho { background:var(--borda2); border-radius:4px; height:14px; overflow:hidden }
 .barra .trilho i { display:block; height:100%; background:var(--barra);
   border-radius:0 4px 4px 0 }
 .barra .valor { font-size:.8rem; font-variant-numeric:tabular-nums; text-align:right;
   color:var(--texto2) }
 .barra .valor em { color:var(--suave); font-style:normal }
 .barra:hover .dia { color:var(--texto) }

 table { width:100%; border-collapse:collapse }
 th,td { text-align:left; padding:6px 0; font-weight:400; vertical-align:top; font-size:.84rem }
 th { color:var(--suave); white-space:nowrap; padding-right:14px; width:1%; font-variant-numeric:tabular-nums }
 tr+tr th, tr+tr td { border-top:1px solid var(--borda2) }
 td.n, .n { font-variant-numeric:tabular-nums }
 .bem { color:var(--bem) } .pior { color:var(--mal) }
 .vazio { color:var(--suave); font-size:.84rem; margin:0 }
 footer { color:var(--suave); font-size:.76rem; max-width:70ch; margin-top:24px; line-height:1.6 }
 code { background:var(--borda2); padding:1px 5px; border-radius:4px; font-size:.9em }
</style></head><body>

<header>
  <h1>Consola OK4Sticks</h1>
  <span class="meta">${esc(dia)} · actualiza-se a cada 60 s · <code>/api</code> dá JSON</span>
</header>

<div class="grelha">

  <section class="l12">
    <div class="estado">
      <span class="farol"></span>
      <b>${s ? (mal ? 'algo está mal' : 'tudo em ordem') : 'sem leitura ainda'}</b>
      <span class="porque">
        ${
			s
				? [
						`${s.jogos_hoje} jogos hoje`,
						`${s.a_decorrer} na janela`,
						`dados de há ${s.dados_com_minutos ?? '?'} min`,
						s.sem_resultado?.length
							? `<span>${s.sem_resultado.length} sem resultado há mais de 2 h</span>`
							: null,
						s.ao_vivo_preso?.length ? `<span>"ao vivo" preso em ${s.ao_vivo_preso.length}</span>` : null,
						s.publicacao_velha ? '<span>publicação parada com jogos a decorrer</span>' : null
					]
						.filter(Boolean)
						.join(' · ')
				: 'o cron corre nas horas de jogos — ou força com /observar'
		}
      </span>
    </div>
  </section>

  <div class="l12 paineis">
    ${painel(
		'aparelhos hoje',
		hoje.aparelhos ?? '—',
		hoje.aparelhos ? `${hoje.novos ?? 0} pela primeira vez` : 'contagem exacta, uma por dia'
	)}
    ${painel('aberturas hoje', hoje.aberturas ? `~${hoje.aberturas}` : '0', 'estimadas, 1 em 10')}
    ${painel('ecrãs abertos hoje', totalEcras, `${ecrasHoje.length} ecrãs diferentes`)}
    ${painel(
		'pedidos à APL',
		estado?.pedidos_fonte ?? '—',
		estado?.pedidos_falhados
			? `<span class="pior">${estado.pedidos_falhados} falhados</span>`
			: 'na última ronda',
		estado?.pedidos_falhados ? 'mal' : ''
	)}
    ${painel(
		'cadência',
		rel.cadencia_s.mediana != null ? `${rel.cadencia_s.mediana}s` : '—',
		rel.buracos_acima_de_3min.length
			? `<span class="pior">${rel.buracos_acima_de_3min.length} buraco(s) > 3 min</span>`
			: 'mediana entre publicações',
		rel.buracos_acima_de_3min.length ? 'mal' : ''
	)}
  </div>

  <section class="l8">
    <h2>quem usa a aplicação — aparelhos distintos por dia</h2>
    ${barras(serie)}
    <p class="vazio" style="margin-top:10px">
      ${semana} ${semana === 1 ? 'aparelho' : 'aparelhos'} em ${comDados.length}
      ${comDados.length === 1 ? 'dia' : 'dias'}; o <em>+n</em> são os que abriram a app pela
      primeira vez. É o próprio aparelho que decide se já foi contado hoje, guardando uma
      data — não há identificador nenhum, logo não dá para saber se o aparelho de hoje é o
      mesmo de ontem. São aparelhos e não pessoas: telemóvel e PC da mesma pessoa contam dois.${
			serie.length > comDados.length
				? ' Os dias com travessão são anteriores a este contador.'
				: ''
		}
    </p>
  </section>

  <section class="l4">
    <h2>que ecrãs abriram hoje</h2>
    ${tabela(
		ecrasHoje.map(
			([k, v]) =>
				`<tr><td>${esc(ECRAS[k] ?? k)}</td><th class="n" style="text-align:right">${esc(v)}</th></tr>`
		),
		'ninguém abriu nada hoje'
	)}
  </section>

  <section class="l6">
    <h2>golos de hoje, à hora a que apareceram</h2>
    ${tabela(
		rel.resultados.map(
			(r) =>
				`<tr><th>${esc(r.t)}</th><td>#${esc(r.id)} <span class="n">${esc(r.de)}</span> → <b class="n">${esc(r.para)}</b> <span class="vazio">${esc(r.situacao ?? '')}</span></td></tr>`
		),
		'nenhum golo observado hoje'
	)}
  </section>

  <section class="l6">
    <h2>a cadeia — últimas corridas</h2>
    ${tabela(
		runs.map(
			(r) =>
				`<tr><th>${esc((r.quando ?? '').slice(5, 16).replace('T', ' '))}</th><td>${esc(r.nome)}
         <span class="${r.estado === 'success' ? 'bem' : r.estado === 'failure' ? 'pior' : 'vazio'}">${esc(r.estado)}</span>
         <span class="vazio">${esc(r.evento ?? '')}</span></td></tr>`
		),
		'sem corridas'
	)}
  </section>

  <section class="l12">
    <h2>o que cada ronda produziu</h2>
    ${tabela(
		diario
			.slice()
			.reverse()
			.map(
				(r) =>
					`<tr><th>${esc((r.ts ?? '').slice(5, 16).replace('T', ' '))}</th><td class="n">${esc(r.contagens?.jogos)} jogos · ${esc(r.contagens?.jogos_disputados)} disputados · ${esc(r.contagens?.fichas)} fichas · ${esc(r.contagens?.linhas_classificacao)} linhas de tabela · ${esc(r.contagens?.feeds_ics)} feeds</td></tr>`
			),
		'sem rondas registadas'
	)}
  </section>
</div>

<footer>
  Lê só o que nós publicamos — nunca a fonte. A <strong>cadência</strong> são os intervalos
  entre dados novos no nosso CDN e <strong>não</strong> mede o tempo desde que um golo foi
  marcado: isso exige alguém no pavilhão com um cronómetro. As <strong>aberturas</strong> são
  pedidos de <code>meta.json</code> contados 1 em 10 e multiplicados, porque é o único sinal
  que atravessa o service worker — os <strong>ecrãs</strong> são navegações que chegaram ao
  servidor, logo contam sobretudo primeiras visitas, links partilhados e recarregamentos.
</footer>
</body></html>`;
}
