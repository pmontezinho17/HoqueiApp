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
 * ## Fechada à chave, e porquê agora
 *
 * No Worker a consola era pública: o endereço não se adivinhava e o que ela mostra são
 * resultados de jogos, que são públicos. Em `hoquei.pages.dev/consola` adivinha-se à
 * primeira — e aqui já se vê quantas pessoas usam a app, que é outra coisa. Fica atrás da
 * mesma `CHAVE_CONTAGENS` que fecha o `/contagens`.
 */

/** O endereço do `/api`. Em `vars` para não ficar escrito em dois sítios quando mudar. */
const OBSERVADOR = 'https://hoquei-observador.torneiopa.workers.dev';

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
	if (url.searchParams.get('chave') !== env.CHAVE_CONTAGENS) {
		// 404 e não 403: um 403 confirmava o endereço a quem o andasse a sondar
		return new Response('Não existe nada aqui.', { status: 404 });
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
