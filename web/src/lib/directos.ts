/**
 * Os jogos com transmissão em directo — **escritos à mão, porque não há de onde os ler**.
 *
 * A plataforma da APL não diz em lado nenhum que um jogo está a ser transmitido, e não há
 * sinal nenhum nos dados que permita descobri-lo. Enquanto não houver, isto é uma lista.
 * Assumidamente.
 *
 * ## O que isto é, e o que não é
 *
 * A 10/10/2026 um amigo do dono pôs uma câmara XbotGo a transmitir o CD PAÇO ARCOS B – AE
 * FISICA D B dos sub-13, num endereço público do fabricante. A transmissão é dele, a página
 * é do XbotGo, e nós só apontamos para lá — o leitor que aparece na app é o deles, com a
 * marca deles por cima. **Não alojamos nada, não guardamos vídeo, e não tiramos a marca de
 * ninguém.**
 *
 * É por isso que o campo se chama `fonte` e aparece escrito no ecrã: quem vê tem de saber de
 * quem é a transmissão, e tem de poder abri-la no sítio original.
 *
 * ## Isto não aparece em produção, e não é por eu me lembrar
 *
 * Foi pedido como experiência — *"vamos apenas testar no site de testes"*. O `directoDe` só
 * devolve alguma coisa num site de ramo: em `hoquei.pages.dev` devolve sempre `undefined`,
 * e por isso não há câmara na lista, não há separador na ficha e não há `<iframe>` nenhum.
 *
 * **É deliberado que a trava esteja aqui e não no calendário de quem publica.** A alternativa
 * era deixar isto ir a produção no dia em que o ramo de testes fosse fundido no `main` — e
 * esse dia chega sem ninguém se lembrar de que havia uma experiência lá dentro.
 *
 * Mesma função que guarda a porta dos sites de ramo: uma só definição de "onde estamos".
 *
 * Uma lista escrita à mão também não escala para uma época inteira, e antes de isto ir a
 * sério há duas perguntas por responder: quem mantém a lista, e o que acontece quando o
 * endereço morre a meio de um sábado. A segunda já tem metade da resposta no `Directo.svelte`.
 */
import { ehSiteDeRamo } from './ambiente.js';

export type Directo = {
	/** o endereço da página que se embebe e que também se abre num separador novo */
	url: string;
	/** de quem é a transmissão — vai escrito no ecrã, não é metadado interno */
	fonte: string;
};

/** id do jogo na fonte → a transmissão. */
export const DIRECTOS: Record<number, Directo> = {
	// CD PAÇO ARCOS B – AE FISICA D B, sub-13 série D, 10/10/2026 às 17:30
	9539: {
		url: 'https://cloud.xbotgo.net/live?userId=MjA5NjUxMzg0NzExMjQ2NjQzMg==&language=pt_PT&region=EU',
		fonte: 'XbotGo'
	}
};

/**
 * A transmissão deste jogo **na lista**, sem olhar a onde estamos.
 *
 * Separada do `directoDe` para poder ser testada: a outra depende do anfitrião, e um teste
 * que dependa do anfitrião mede o ambiente e não a lista.
 *
 * Aceita `null` para o id porque a agenda tem jogos sem id — os que a fonte ainda não
 * numerou — e quem chama não deve ter de se lembrar disso.
 *
 * @param id o id do jogo na fonte
 */
export function naLista(id: number | null | undefined): Directo | undefined {
	return id == null ? undefined : DIRECTOS[id];
}

/**
 * Estamos num sítio onde a experiência pode aparecer?
 *
 * No servidor — e durante a pré-construção das páginas, que é onde o HTML estático nasce —
 * não há `location`, e a resposta é **não**. É o que garante que a câmara nunca entra no
 * HTML publicado, mesmo que este código vá parar a produção.
 */
function numSiteDeRamo(): boolean {
	return typeof location !== 'undefined' && ehSiteDeRamo(location.hostname);
}

/**
 * A transmissão deste jogo, ou `undefined` — **e sempre `undefined` em produção**.
 *
 * É esta que a app usa. Ver o cabeçalho do ficheiro para o porquê da trava estar aqui.
 *
 * @param id o id do jogo na fonte
 */
export function directoDe(id: number | null | undefined): Directo | undefined {
	return numSiteDeRamo() ? naLista(id) : undefined;
}
