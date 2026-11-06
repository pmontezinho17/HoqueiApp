/**
 * Em que secção da barra de baixo é que a pessoa está.
 *
 * ## Porque é que isto existe
 *
 * Até 31/10/2026 a barra só acendia um separador quando o endereço começava por ele. Uma
 * ficha de jogo (`/jogo/…`) e a página de uma equipa (`/equipa/…`) não começam por nenhum,
 * e a barra ficava **sem nada aceso** — o dono deu por isso no telemóvel: *"perdemos a noção
 * de qual o menu que estamos"*. Abrir um jogo a partir dos Jogos, ou uma equipa a partir do
 * Meu Clube, e explorar os separadores dela, deixava de dizer de onde se tinha vindo.
 *
 * **A secção de uma página de detalhe é a de onde se veio.** Um jogo aberto a partir de uma
 * competição continua nas Competições; o mesmo jogo aberto a partir da lista de jogos fica
 * nos Jogos. É o que fazem as aplicações com barra em baixo (a theScore, a Sofascore): a barra
 * diz em que ramo da navegação se está, não que tipo de página é.
 *
 * Vive aqui e não no `+layout.svelte` pela regra do `AGENTS.md`: uma decisão num `.svelte` é
 * invisível para os testes.
 */

export type Seccao = '/' | '/clube' | '/competicoes';

/**
 * Quem chega por um link directo a um detalhe não veio de lado nenhum. Um jogo é dos Jogos; uma
 * equipa é das Competições, que é onde se chega a qualquer equipa — o Meu Clube só tem as que
 * a pessoa segue.
 */
const POR_OMISSAO: [string, Seccao][] = [
	['/jogo/', '/'],
	['/equipa/', '/competicoes']
];

/**
 * @param caminho o `pathname` da página aberta
 * @param anterior a secção da página de onde se veio, ou `null` à entrada na app
 * @returns a secção a acender, ou `null` numa página que não pertence a nenhuma (a ajuda, a
 *   privacidade, a consola) aberta à entrada
 */
export function seccaoDe(caminho: string, anterior: Seccao | null): Seccao | null {
	if (caminho === '/') return '/';
	if (caminho === '/clube' || caminho.startsWith('/clube/')) return '/clube';
	if (caminho === '/competicoes' || caminho.startsWith('/competicoes/')) return '/competicoes';
	if (anterior) return anterior;
	return POR_OMISSAO.find(([prefixo]) => caminho.startsWith(prefixo))?.[1] ?? null;
}
