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
 * A lista não ficou literalmente vazia porque, no momento dessa decisão, ele estava a ver o
 * jogo no site de testes. Em vez de a esvaziar à mão depois — e de confiar em que alguém se
 * lembrasse — cada entrada passou a ter `data`, e **só conta no próprio dia**. O jogo de
 * 10/10 desaparece sozinho a 11/10, e por isso a publicação de segunda-feira leva a
 * capacidade e não leva transmissão nenhuma.
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
	// CD PAÇO ARCOS B – AE FISICA D B, sub-13 série D, 10/10/2026 às 17:30
	9539: {
		data: '2026-10-10',
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
	hoje: string = diaDeLisboa()
): Directo | undefined {
	const d = naLista(id);
	return d && d.data === hoje ? d : undefined;
}
