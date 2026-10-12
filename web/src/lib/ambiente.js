/**
 * Em que site estamos — o a sério, ou o de um ramo.
 *
 * Existe por um acidente de 10/10/2026: o dono partilhou o endereço do ramo `testes` em vez
 * do de produção, e ficou com pessoas a usar um site que serve **os dados do último commit**
 * e não os que o ciclo ao vivo escreve de 30 em 30 segundos. Medido nesse dia, com 36 jogos
 * a decorrer: o `testes` estava 26 horas atrás e não mostrava um único resultado do dia. Não
 * era o endereço errado, era a app a mentir a quem tinha um filho em campo.
 *
 * Em JavaScript e não em TypeScript de propósito: isto é lido tanto pela app como pela Pages
 * Function `_middleware.js`, e a Function importa do `src/lib` tal e qual — é o mesmo caminho
 * que o `consola.js` já faz.
 */

/** O site a sério. Um só sítio a saber disto, senão fica escrito em cinco. */
export const PRODUCAO = 'hoquei.pages.dev';

/**
 * Se este anfitrião é um site de ramo e não o verdadeiro.
 *
 * A Cloudflare dá dois endereços a cada publicação de um ramo: o do ramo
 * (`versoes.hoquei.pages.dev`) e o daquela publicação em concreto
 * (`99fd44ce.hoquei.pages.dev`). **Os dois contam**, e é de propósito: o dono pediu uma
 * tranca, e deixar o segundo de fora era deixar uma porta aberta que basta copiar do resumo
 * de uma publicação.
 *
 * O `localhost` não conta — em desenvolvimento não há nada de que proteger, e pôr a porta a
 * aparecer no `npm run dev` era tornar o trabalho diário mais lento por nada.
 *
 * @param {string | null | undefined} anfitriao
 */
export function ehSiteDeRamo(anfitriao) {
	const h = (anfitriao ?? '').toLowerCase().split(':')[0];
	if (!h.endsWith('.pages.dev')) return false;
	return h !== PRODUCAO;
}

/**
 * O mesmo endereço, no site a sério: o caminho e a pesquisa vão atrás.
 *
 * Levar a pessoa à raiz seria mais fácil e pior — quem abriu um link para a ficha de um jogo
 * quer a ficha daquele jogo, não a página inicial com o jogo por encontrar outra vez.
 *
 * @param {URL} url
 */
export function paraProducao(url) {
	return `https://${PRODUCAO}${url.pathname}${url.search}${url.hash}`;
}

/**
 * Esta pessoa já passou a porta do site de ramo?
 *
 * Lê a marca que o `_middleware.js` escreve — ver `MARCA`, no `portaTestes.js`, para o
 * porquê de haver duas. Puro, para poder ser testado: o `document.cookie` entra como texto.
 *
 * @param {string | null | undefined} cookies o `document.cookie`
 */
export function temChaveDoRamo(cookies) {
	return (cookies ?? '').split(';').some((c) => c.trim() === 'ok4sticks_testes_ok=1');
}
