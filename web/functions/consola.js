/**
 * A consola, em `hoquei.pages.dev/consola`.
 *
 * ## Porque é que mudou de casa
 *
 * Esteve no Worker observador, cujo endereço é `…torneiopa.workers.dev`. O `torneiopa` é o
 * subdomínio de uma aplicação anterior do dono, e a Cloudflare dá **um** subdomínio
 * `workers.dev` por conta — não um por projecto. As saídas reais eram uma segunda conta, que
 * partia as ligações por elas serem por conta, ou um domínio próprio, que está adiado
 * (B9.27). Mudar a página de casa custa isto.
 *
 * ## O que corre aqui e o que corre lá
 *
 * Aqui só se **desenha**. Os dados chegam já prontos do `/api` do observador, numa resposta
 * só. A alternativa era esta Function ir ela própria à base de dados e à GitHub — e aí
 * passavam a existir dois sítios a saber como se lêem as medições, mais um segredo da GitHub
 * guardado no projecto de Pages. Um salto a mais dentro da Cloudflare é mais barato do que
 * duas verdades sobre os mesmos números.
 *
 ## Fechada à chave, e a chave cola-se uma vez
 *
 * No Worker a consola era pública: o endereço não se adivinhava e o que ela mostra são
 * resultados de jogos, que são públicos. Em `hoquei.pages.dev/consola` adivinha-se à
 * primeira — e aqui já se vê quantas pessoas usam a app, que é outra coisa. Fica atrás da
 * mesma `CHAVE_CONTAGENS` que fecha o `/contagens`.
 *
 * **A chave não se escreve no endereço a cada visita.** A primeira versão exigia
 * `?chave=…` sempre, e eu respondi ao dono que um favorito resolvia. Ele perguntou duas
 * vezes, e tinha razão: um favorito resolve *reescrever*, não resolve **abrir a consola de
 * cabeça**, que é o que se faz quando se está num pavilhão com o telemóvel na mão.
 *
 * Agora `/consola` sem chave devolve uma caixa. Cola-se a chave uma vez, ela fica no
 * `localStorage` desse browser, e a partir daí o endereço simples basta.
 *
 * **O que isto custa, e é honesto dizê-lo:** antes, sem chave, isto respondia 404 e escondia
 * que existia. Agora quem adivinhar o caminho fica a saber que há aqui uma consola. Entrar
 * continua a exigir a chave — a diferença é entre uma porta sem campainha e uma porta com
 * fechadura, e a fechadura é a mesma.
 *
 * **Sem cookie**, de propósito: a `/privacidade` promete zero cookies e essa promessa não se
 * gasta nisto. O `localStorage` fica enumerado nessa página, no mesmo commit, com a nota de
 * que só existe em quem abra a consola de manutenção.
 */

/** O endereço do `/api`. Em `vars` para não ficar escrito em dois sítios quando mudar. */
const OBSERVADOR = 'https://hoquei-observador.torneiopa.workers.dev';

/** Onde o browser guarda a chave da consola. Enumerada na `/privacidade`. */
const GUARDADA = 'ok4sticks:consola:chave';

/**
 * A caixa onde se cola a chave, uma vez.
 *
 * Serve-se do servidor e não do SvelteKit porque isto não é uma rota da app — e por isso é
 * HTML à mão, com o mínimo: dois temas, uma caixa, um botão. Sem dependências e sem build.
 *
 * @param {boolean} errada se a chave que chegou estava errada
 */
function porta(errada) {
	const html = `<!doctype html>
<html lang="pt-PT"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Consola — OK4Sticks</title>
<style>
 :root { color-scheme: light dark;
   --fundo:#f6f7f8; --cartao:#fff; --texto:#15181c; --suave:#6b7480; --borda:#dde1e6;
   --acento:#0f7a52; --mal:#b3261e }
 @media (prefers-color-scheme: dark) { :root {
   --fundo:#101216; --cartao:#171a1f; --texto:#e8eaed; --suave:#9aa3af; --borda:#282d35;
   --acento:#2ea37a; --mal:#f2b8b5 } }
 body { margin:0; min-height:100vh; display:grid; place-items:center;
   background:var(--fundo); color:var(--texto);
   font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; padding:24px }
 form { background:var(--cartao); border:1px solid var(--borda); border-radius:14px;
   padding:24px; width:100%; max-width:26rem; box-sizing:border-box }
 h1 { font-size:1rem; margin:0 0 4px }
 p { color:var(--suave); font-size:.82rem; margin:0 0 16px }
 p.erro { color:var(--mal) }
 input { width:100%; box-sizing:border-box; padding:11px 12px; font:inherit;
   color:var(--texto); background:var(--fundo); border:1px solid var(--borda);
   border-radius:9px }
 input:focus { outline:2px solid var(--acento); outline-offset:1px }
 button { width:100%; margin-top:12px; padding:12px; font:inherit; font-weight:600;
   min-height:44px; color:#fff; background:var(--acento); border:0; border-radius:9px;
   cursor:pointer }
</style>
</head><body>
<form id="f">
  <h1>Consola</h1>
  <p${errada ? ' class="erro"' : ''}>${
		errada
			? 'Essa chave não serve. Cola a que está em <code>CHAVE_CONTAGENS</code>.'
			: 'Cola a chave uma vez. Fica guardada neste browser e não voltas a precisar dela.'
	}</p>
  <input id="k" type="password" autocomplete="off" autocapitalize="off" spellcheck="false"
    placeholder="chave" aria-label="Chave da consola" required>
  <button type="submit">Entrar</button>
</form>
<script>
 var G = ${JSON.stringify(GUARDADA)};
 // A chave errada apaga-se **antes** de se voltar a pedir: sem isto, uma chave mudada no
 // painel punha este browser a tentar a antiga a cada visita, para sempre.
 if (${errada ? 'true' : 'false'}) { try { localStorage.removeItem(G); } catch (e) {} }
 else {
   try {
     var g = localStorage.getItem(G);
     if (g) location.replace('?chave=' + encodeURIComponent(g));
   } catch (e) {}
 }
 document.getElementById('f').addEventListener('submit', function (e) {
   e.preventDefault();
   var v = document.getElementById('k').value.trim();
   if (!v) return;
   try { localStorage.setItem(G, v); } catch (err) {}
   location.replace('?chave=' + encodeURIComponent(v));
 });
</script>
</body></html>`;
	return new Response(html, {
		// 200 e não 401: não há autenticação HTTP aqui, e um 401 fazia o browser abrir a sua
		// própria caixa de utilizador e palavra-passe por cima desta.
		status: 200,
		headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
	});
}

import { pagina } from '../src/lib/consola.js';

/**
 * @param {{ request: Request, env: { CHAVE_CONTAGENS?: string, OBSERVADOR?: string } }} contexto
 */
export async function onRequestGet({ request, env }) {
	const url = new URL(request.url);

	if (!env?.CHAVE_CONTAGENS) {
		// 503 e não 404: aqui a falta de chave é uma configuração por fazer, e esconder isso
		// faria alguém procurar o erro na Function em vez de no painel
		return new Response('A consola não tem chave configurada neste projecto.', {
			status: 503,
			headers: { 'Content-Type': 'text/plain; charset=utf-8' }
		});
	}

	const chave = url.searchParams.get('chave');
	if (!chave) return porta(false);
	if (chave !== env.CHAVE_CONTAGENS) {
		// A caixa outra vez, a dizer que a chave está errada. **Não é um 403 nem um ciclo:**
		// a página apaga a chave guardada antes de voltar a pedir, senão uma chave mudada no
		// painel punha o browser a tentar a antiga para sempre.
		return porta(true);
	}

	const dia = url.searchParams.get('dia');
	const api = `${env.OBSERVADOR ?? OBSERVADOR}/api${dia ? `?dia=${encodeURIComponent(dia)}` : ''}`;

	let dados;
	try {
		const r = await fetch(api, { headers: { 'Cache-Control': 'no-cache' } });
		if (!r.ok) throw new Error(`HTTP ${r.status}`);
		dados = await r.json();
	} catch (e) {
		// Uma consola em branco não diz nada a quem a abre às 22:00 de um sábado. Diz-se o
		// que falhou e onde, que é o que permite ir ver.
		return new Response(
			`<!doctype html><meta charset="utf-8"><title>Consola — sem dados</title>` +
				`<body style="font:16px/1.5 system-ui;max-width:40rem;margin:4rem auto;padding:0 1rem">` +
				`<h1>A consola não conseguiu ler as medições.</h1>` +
				`<p>O <code>/api</code> do observador respondeu <b>${String(e).replace(/[<&]/g, '')}</b>.</p>` +
				`<p>Os dados do site <b>não dependem disto</b>: a app serve ficheiros estáticos do CDN ` +
				`e continua a funcionar. O que está em baixo é a medição.</p>`,
			{ status: 502, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
		);
	}

	// O `<meta http-equiv="refresh">` da página não leva endereço, logo recarrega o actual
	// com a chave incluída — é por isso que a actualização de 60 em 60 s continua a passar a
	// porta. Verificado a 09/10/2026.
	//
	// A chave vai também para a página, porque os links dos dias anteriores têm de a levar: um
	// link sem ela dava 404 a quem já estava dentro.
	return new Response(pagina({ ...dados, chave: url.searchParams.get('chave') ?? undefined }), {
		headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
	});
}
