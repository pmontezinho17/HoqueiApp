/**
 * **As duas vias da caixa de opinião: uma sugestão, ou uma pergunta.**
 *
 * Pedido do dono a 26/10/2026: *"muitas vezes existem dúvidas que eu queria responder ou que
 * não entendo"*. A caixa só sabia fazer uma coisa — gravar o texto, sem saber quem o escreveu —
 * e isso é exactamente o que se quer de uma sugestão e o contrário do que se quer de uma
 * dúvida. A sugestão não precisa de resposta, precisa de ficar registada; a dúvida só serve se
 * houver para onde responder.
 *
 * **A pergunta vai pelo email da pessoa, e não por um campo de email na caixa.** Um campo
 * desses obrigava-nos a guardar um endereço na base de dados — o primeiro dado pessoal que
 * este projecto guardaria, com tudo o que isso traz à política de privacidade — para depois o
 * copiar à mão para o Gmail. Pelo `mailto:` a pessoa escreve do seu próprio email, a resposta
 * é um "Responder" no Gmail, e nada passa pela nossa base de dados.
 *
 * O preço é conhecido: num telemóvel sem programa de email configurado, o `mailto:` não abre
 * nada de útil. Por isso a caixa mostra o endereço por extenso e deixa copiar o texto.
 */
import { CONTACTO } from './contacto';
import { APP_NOME } from './sitio';

export type Via = 'sugestao' | 'pergunta';

/**
 * O assunto muda com a via, e é isso que deixa o dono filtrar no Gmail o que precisa de
 * resposta. Uma sugestão só chega por email quando o envio directo falha.
 */
const ASSUNTO: Record<Via, string> = {
	sugestao: 'sugestão',
	pergunta: 'pergunta'
};

/** O `mailto:` com o texto e o contexto já escritos, como a pessoa os vê na caixa. */
export function linkDeEmail(via: Via, texto: string, contexto: string, para = CONTACTO): string {
	const corpo = `${texto.trim()}\n\n—\n${contexto}`;
	return (
		`mailto:${para}?subject=${encodeURIComponent(`${APP_NOME} — ${ASSUNTO[via]}`)}` +
		`&body=${encodeURIComponent(corpo)}`
	);
}
