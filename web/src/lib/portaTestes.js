/**
 * A página que o site de um ramo mostra a quem lá chega: o aviso **e** a tranca.
 *
 * O dono escolheu as duas coisas a 10/10/2026, depois de ter partilhado o endereço de testes
 * por engano. São as duas na mesma página de propósito, e isso é uma diferença em relação ao
 * Cloudflare Access: o Access mostra a página de "acesso negado" dele, que tranca mas não diz
 * a ninguém para onde ir. Quem aqui chega por engano é a pessoa que mais precisa de uma
 * indicação, e é a primeira coisa que lê.
 *
 * Por isso a ordem na página é esta e não a inversa: o caminho para o site a sério em letras
 * grandes e com um botão, e a caixa da chave pequena, em baixo, para quem sabe o que é.
 *
 * HTML escrito à mão e servido pela Function, como a porta da consola: isto tem de aparecer
 * **antes** de a app carregar, e qualquer coisa que dependa do build do SvelteKit já é tarde.
 *
 * Cuidado ao mexer: isto é um *template literal* dentro de outro. Já se partiu cinco vezes no
 * `consola.js` por causa de uma plica inclinada perdida — é por isso que há um teste que
 * monta a página inteira e lhe procura os pedaços.
 */

/** O nome do cookie que diz "esta pessoa já deu a chave". */
export const COOKIE = 'ok4sticks_testes';

/**
 * @param {{ destino: string, errada?: boolean, semChave?: boolean }} opcoes
 *   `destino` é o endereço equivalente no site a sério;
 *   `errada` repete a caixa a dizer que a chave não serve;
 *   `semChave` é a configuração por fazer — o segredo não está definido no ambiente.
 */
export function porta({ destino, errada = false, semChave = false }) {
	const aviso = semChave
		? `<p class="nota">A chave deste site não está configurada. Define
       <code>CHAVE_TESTES</code> no ambiente <b>Preview</b> do projecto, no painel da
       Cloudflare.</p>`
		: `<form id="f">
      <label for="k">Chave</label>
      <input id="k" type="password" autocomplete="off" autocapitalize="off" spellcheck="false"
        placeholder="chave do site de testes" required>
      <button type="submit">Entrar</button>
      ${errada ? '<p class="erro">Essa chave não serve.</p>' : ''}
    </form>`;

	return `<!doctype html>
<html lang="pt-PT"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Este não é o site do OK4Sticks</title>
<style>
 :root { color-scheme: light dark;
   --fundo:#f6f7f8; --cartao:#fff; --texto:#15181c; --suave:#6b7480; --borda:#dde1e6;
   --acento:#0f7a52; --mal:#b3261e }
 @media (prefers-color-scheme: dark) { :root {
   --fundo:#101216; --cartao:#171a1f; --texto:#e8eaed; --suave:#9aa3af; --borda:#282d35;
   --acento:#2ea37a; --mal:#f2b8b5 } }
 * { box-sizing:border-box }
 body { margin:0; min-height:100vh; display:grid; place-items:center;
   background:var(--fundo); color:var(--texto);
   font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; padding:24px }
 main { width:100%; max-width:28rem }
 .cartao { background:var(--cartao); border:1px solid var(--borda); border-radius:16px;
   padding:28px 24px }
 h1 { font-size:1.35rem; line-height:1.25; margin:0 0 10px }
 .porque { color:var(--suave); font-size:.92rem; margin:0 0 22px }
 a.ir { display:flex; align-items:center; justify-content:center; min-height:52px;
   padding:0 18px; font-weight:700; font-size:1rem; text-decoration:none; color:#fff;
   background:var(--acento); border-radius:12px }
 .morada { margin:12px 0 0; text-align:center; font-size:.85rem; color:var(--suave);
   word-break:break-all }
 .morada b { color:var(--texto); font-weight:600 }
 details { margin-top:26px; border-top:1px solid var(--borda); padding-top:14px }
 summary { cursor:pointer; color:var(--suave); font-size:.82rem; min-height:44px;
   display:flex; align-items:center }
 label { display:block; font-size:.78rem; color:var(--suave); margin:6px 0 6px }
 input { width:100%; padding:11px 12px; font:inherit; color:var(--texto);
   background:var(--fundo); border:1px solid var(--borda); border-radius:9px }
 input:focus { outline:2px solid var(--acento); outline-offset:1px }
 button { width:100%; margin-top:10px; padding:12px; font:inherit; font-weight:600;
   min-height:44px; color:#fff; background:var(--acento); border:0; border-radius:9px;
   cursor:pointer }
 .erro { color:var(--mal); font-size:.82rem; margin:10px 0 0 }
 .nota { color:var(--suave); font-size:.82rem; margin:10px 0 0 }
 code { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:.9em }
</style>
</head><body>
<main class="cartao">
  <h1>Este é o site de testes. Os resultados aqui estão parados.</h1>
  <p class="porque">É uma cópia para experiências, e os jogos de hoje não aparecem cá. O
    site a sério actualiza-se durante os jogos, de meio em meio minuto.</p>
  <a class="ir" href="${destino}">Ir para o OK4Sticks</a>
  <p class="morada">e guarda esta morada: <b>${new URL(destino).host}</b></p>
  <details>
    <summary>Sou eu, deixa-me entrar</summary>
    ${aviso}
  </details>
</main>
<script>
 document.addEventListener('submit', function (e) {
   e.preventDefault();
   var v = document.getElementById('k').value.trim();
   if (!v) return;
   // A chave vai no endereço uma vez só; a Function responde com um cookie e manda-nos de
   // volta para a mesma página sem ela. Assim não fica na barra nem no histórico.
   var u = new URL(location.href);
   u.searchParams.set('chave', v);
   location.replace(u.toString());
 });
 // A caixa abre-se sozinha quando a chave estava errada: sem isto a mensagem de erro ficava
 // escondida dentro do <details> fechado e parecia que o botão não tinha feito nada.
 if (${errada ? 'true' : 'false'}) { document.querySelector('details').open = true; }
</script>
</body></html>`;
}
