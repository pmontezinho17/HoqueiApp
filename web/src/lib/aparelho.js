/**
 * Que **tipo** de aparelho abriu a app: iOS, Android, computador, ou outro.
 *
 * ## Porque é que isto existe, e o que mudou com isto
 *
 * O dono perguntou a 21/10/2026 se dava para distinguir *"se iPhone se Android, ou se outra
 * coisa como um PC por exemplo"*, e disse que achava que já via isso no painel da Cloudflare.
 * Via — porque o projecto Pages tinha a **Web Analytics** ligada e a Cloudflare injectava o
 * `beacon.min.js` em todas as páginas, coisa que a `/privacidade` diz pelo nome que não existe
 * aqui. O beacon sai; a pergunta fica, e tem resposta sem terceiros.
 *
 * **Isto é a primeira vez que o projecto guarda alguma coisa sobre o aparelho de quem visita.**
 * Até aqui o `contar.js` dizia, em comentário, que não lia *"nem IP, nem cabeçalhos, nem
 * identificador"*. Passa a ler **um** cabeçalho, o `User-Agent`, e a guardar dele **um de quatro
 * rótulos**. A decisão de atravessar essa linha é do dono, de 21/10/2026, e a política de
 * privacidade foi reescrita no mesmo commit — senão a página passava a mentir, que é
 * exactamente o que acabámos de encontrar do lado do beacon.
 *
 * ## O que isto não é
 *
 * Não é um identificador e não se aproxima de um. O que fica guardado é uma contagem por dia e
 * por rótulo — `2026-10-21 · ios · 47` — e não há nada que ligue uma visita a outra, nem sequer
 * dentro do mesmo dia. O `User-Agent` é lido, usado para escolher o rótulo, e deitado fora: não
 * se guarda a cadeia, que essa sim é quase um identificador quando se junta a um IP.
 *
 * ## Os limites, ditos à frente
 *
 * **O iPad conta como computador.** Desde o iPadOS 13 o Safari do iPad anuncia-se como
 * `Macintosh` por omissão, e distingui-lo exige adivinhar pelo toque — coisa que o servidor não
 * vê. Preferir um rótulo errado e honesto a um certo e inventado: quem quiser saber dos iPads
 * tem de perguntar de outra maneira.
 *
 * **A ordem dos testes importa.** Um Android anuncia-se como `Linux`, por isso o Android vem
 * antes; e um `iPhone` também diz `Mobile Safari`, por isso o iOS vem antes de tudo.
 *
 * ## Em JavaScript e não em TypeScript, de propósito
 *
 * Isto é lido pela app **e** pela Pages Function `contar.js`, e as Functions importam `.js` do
 * `src/lib` tal e qual — é o que o `ambiente.js` já faz, pela mesma razão e com o mesmo aviso
 * escrito. Um `.ts` aqui partia a Function em produção, e nenhum teste da app o apanhava porque
 * os testes correm sobre o código-fonte e não sobre o que a Cloudflare serve.
 *
 * **`outro` não é lixo.** São televisões, consolas, leitores de ecrã em sistemas que não se
 * reconhecem, e robôs que executem JavaScript. Se um dia crescer, é sinal de que a lista de
 * padrões envelheceu — e é por isso que existe como rótulo e não como silêncio.
 */

/** @typedef {'ios' | 'android' | 'computador' | 'outro'} TipoDeAparelho */

/** @type {{ id: TipoDeAparelho, rotulo: string }[]} */
export const TIPOS = [
	{ id: 'ios', rotulo: 'iPhone' },
	{ id: 'android', rotulo: 'Android' },
	{ id: 'computador', rotulo: 'Computador' },
	{ id: 'outro', rotulo: 'Outro' }
];

/**
 * O rótulo deste `User-Agent`.
 *
 * Ausente, vazio ou irreconhecível dá `outro` — nunca lança, porque isto corre dentro de um
 * contador e uma contagem nunca pode derrubar um pedido.
 *
 * @param {string | null | undefined} ua
 * @returns {TipoDeAparelho}
 */
export function tipoDeAparelho(ua) {
	const s = (ua ?? '').trim().toLowerCase();
	if (!s) return 'outro';
	// o iPhone também diz "mobile safari" e o iPod também é iOS
	if (/iphone|ipod|ios/.test(s)) return 'ios';
	// antes do Linux, porque um Android anuncia-se como Linux
	if (/android/.test(s)) return 'android';
	// o iPad cai aqui de propósito — ver o comentário no topo
	if (/windows|macintosh|mac os x|cros|x11|linux/.test(s)) return 'computador';
	return 'outro';
}
