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
 * ## Cada entrada vale no seu dia, e só nele
 *
 * **Esta é a trava que substituiu a de "só em ramo"**, a 10/10/2026, quando o dono decidiu
 * que a capacidade podia ir a produção: *"não há qualquer problema, pois não vamos ter links
 * de jogo. até acho que já pode avançar, e já fica preparado para estas situações"*. Ele
 * escolheu produção com a lista a valer **vazia**.
 *
 * A lista não ficou vazia nesse dia porque, no momento da decisão, ele estava a ver o jogo no
 * site de testes. Em vez de a esvaziar à mão depois — e de confiar em que alguém se lembrasse
 * — cada entrada passou a ter `data`, e **só conta no próprio dia**. A 12/10 ele mandou apagar
 * a entrada já expirada, e **agora a lista está mesmo vazia**, que é o estado normal: a
 * capacidade está em produção e não há transmissão nenhuma anunciada.
 *
 * Como a trava é a lista estar vazia e não um booleano, ela está no registo de interruptores
 * — ver `bandeiras.ts` — para não ser uma coisa que só este cabeçalho sabe.
 *
 * **Os `naLista` e `directoDe` aceitam a lista por parâmetro**, e é por causa disto: com a
 * lista real vazia, um teste de comportamento que dependesse dela não testava nada. Os testes
 * de comportamento passam a sua própria lista; os de disciplina continuam a olhar para a real.
 *
 * Isto também é o desenho certo independentemente disso: um endereço de transmissão ao vivo
 * de um jogo da semana passada não é informação velha, é informação errada. E a sala do
 * XbotGo é reutilizada de jogo para jogo pelo mesmo utilizador — o endereço continua a
 * responder, a mostrar **outro** jogo.
 *
 * Uma lista escrita à mão não escala para uma época inteira, e antes de isto ser usado a
 * sério há duas perguntas por responder: quem mantém a lista, e o que acontece quando o
 * endereço morre a meio de um sábado. A segunda já tem metade da resposta no `Directo.svelte`.
 */
import { diaDeLisboa } from './presenca';

export type Directo = {
	/** o dia do jogo, `AAAA-MM-DD`. Fora dele a entrada não conta — ver o cabeçalho. */
	data: string;
	/** o endereço da página que se embebe e que também se abre num separador novo */
	url: string;
	/** de quem é a transmissão — vai escrito no ecrã, não é metadado interno */
	fonte: string;
};

/** id do jogo na fonte → a transmissão. */
export const DIRECTOS: Record<number, Directo> = {
	// Vazia, e **vazia é o estado normal** — ver o registo em `bandeiras.ts`. A entrada do
	// jogo de 10/10/2026 foi apagada a 12/10 a pedido do dono: já não podia aparecer a
	// ninguém, porque cada entrada só conta no seu dia, mas era o endereço da câmara de um
	// amigo dele num repositório público a não dar nada em troca.
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
export function naLista(
	id: number | null | undefined,
	lista: Record<number, Directo> = DIRECTOS
): Directo | undefined {
	return id == null ? undefined : lista[id];
}

/**
 * A transmissão deste jogo **hoje**, ou `undefined`.
 *
 * É esta que a app usa. Uma entrada de outro dia não conta — ver o cabeçalho para o porquê,
 * que é mais do que arrumação: a sala do XbotGo é reutilizada, e um endereço de ontem mostra
 * o jogo de hoje de outra gente.
 *
 * `hoje` entra por parâmetro para o teste não depender do calendário. Quem chama não o passa.
 *
 * @param id o id do jogo na fonte
 * @param hoje a data de Lisboa, `AAAA-MM-DD`
 */
export function directoDe(
	id: number | null | undefined,
	hoje: string = diaDeLisboa(),
	lista: Record<number, Directo> = DIRECTOS
): Directo | undefined {
	const d = naLista(id, lista);
	return d && d.data === hoje ? d : undefined;
}
