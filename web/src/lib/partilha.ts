/**
 * Partilhar a aplicação com alguém.
 *
 * Pedido pelo dono a 10/10/2026, e há uma ironia que convém registar: foi ele próprio que,
 * nessa manhã, partilhou o endereço errado por não ter nada à mão que partilhasse o certo.
 * Esta função existe para que a forma fácil seja também a forma certa.
 *
 * **O endereço é sempre o de produção**, nunca `location.href`. Num site de ramo, partilhar
 * o que está na barra era repetir exactamente o engano — e é lá que as experiências vivem.
 */
import { PRODUCAO } from './ambiente.js';
import { APP_NOME } from './sitio';

/** O que se partilha. Nunca o endereço da barra — ver o cabeçalho. */
export const ENDERECO = `https://${PRODUCAO}`;

export const TEXTO =
	'Resultados, calendários e classificações do hóquei em patins da Associação de ' +
	'Patinagem de Lisboa, jogo a jogo.';

/**
 * Se o aparelho tem a folha de partilha nativa.
 *
 * No telemóvel é ela que se quer: abre o WhatsApp, as mensagens e o resto, e é o gesto que
 * as pessoas já conhecem. Num computador raramente existe, e aí copia-se o endereço.
 */
export const PODE_PARTILHAR_NATIVO =
	typeof navigator !== 'undefined' && typeof navigator.share === 'function';

/**
 * Partilha, ou copia. Devolve `'partilhado'`, `'copiado'` ou `'falhou'`.
 *
 * **O cancelamento não é uma falha.** Quem abre a folha de partilha e carrega em "cancelar"
 * faz com que o `navigator.share` rejeite com `AbortError`; tratar isso como erro punha uma
 * mensagem de falha no ecrã de quem simplesmente mudou de ideias.
 */
export async function partilhar(): Promise<'partilhado' | 'copiado' | 'falhou'> {
	if (PODE_PARTILHAR_NATIVO) {
		try {
			await navigator.share({ title: APP_NOME, text: TEXTO, url: ENDERECO });
			return 'partilhado';
		} catch (e) {
			if (e instanceof DOMException && e.name === 'AbortError') return 'partilhado';
			// sem folha nativa utilizável, cai para a cópia em vez de não fazer nada
		}
	}
	try {
		await navigator.clipboard.writeText(ENDERECO);
		return 'copiado';
	} catch {
		return 'falhou';
	}
}
