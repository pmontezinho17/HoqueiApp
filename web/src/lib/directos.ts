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
 * ## Isto vive num ramo, não em produção
 *
 * Foi pedido como experiência — *"vamos apenas testar no site de testes"*. Uma lista escrita
 * à mão não escala para uma época inteira, e antes de isto ir a sério há duas perguntas por
 * responder: quem mantém a lista, e o que acontece quando o endereço morre a meio de um
 * sábado. A segunda já tem metade da resposta no `Directo.svelte`.
 */

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
 * A transmissão deste jogo, ou `undefined`.
 *
 * Aceita `null` para o id porque a agenda tem jogos sem id — os que a fonte ainda não
 * numerou — e quem chama não deve ter de se lembrar disso.
 *
 * @param id o id do jogo na fonte
 */
export function directoDe(id: number | null | undefined): Directo | undefined {
	return id == null ? undefined : DIRECTOS[id];
}
