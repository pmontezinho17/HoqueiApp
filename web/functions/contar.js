/**
 * O contador de aparelhos distintos por dia.
 *
 * Recebe **um toque por aparelho e por dia** — é o cliente que decide, com uma data guardada
 * no próprio aparelho; ver `src/lib/presenca.ts`. Aqui não se lê nem se guarda nada sobre
 * quem tocou: nem IP, nem cabeçalhos, nem identificador. Só se soma um.
 *
 Uma linha por dia na tabela `aparelho`, com os dois números:
 *
 *     dia          total   novos
 *     2026-10-08      14       9
 *
 * **Em D1 desde 09/10/2026, antes eram duas chaves no KV.** Eram duas escritas por aparelho
 * novo, cada uma a ler-somar-escrever, e esse padrão perdia contas quando dois aparelhos
 * tocavam no mesmo instante — num sábado com trinta pessoas a abrir a app ao mesmo tempo,
 * perder contas era o desenho. Aqui é uma linha e um `ON CONFLICT`, numa só ida.
 *
 * Ao contrário do contador de ecrãs, este **não** cresce com o uso de cada um: quem abre a
 * app vinte vezes num dia escreve uma vez.
 */

const diaDeLisboa = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Lisbon' });

/**
 * @param {{ request: Request, env: { DADOS?: import("@cloudflare/workers-types").D1Database }, waitUntil: (p: Promise<unknown>) => void }} contexto
 */
export async function onRequestGet({ request, env, waitUntil }) {
	// 204 sempre, e sem corpo: isto não devolve informação nenhuma a quem chama, e assim um
	// erro do nosso lado nunca aparece no ecrã de ninguém
	const resposta = new Response(null, {
		status: 204,
		headers: { 'Cache-Control': 'no-store' }
	});
	// a ligação numa constante e não `env.DADOS` lá dentro: dentro da função assíncrona do
	// `waitUntil` o compilador perde a garantia que a guarda acima deu
	const bd = env?.DADOS;
	if (!bd) return resposta;

	const novo = new URL(request.url).searchParams.get('novo') === '1' ? 1 : 0;
	const dia = diaDeLisboa();
	waitUntil(
		(async () => {
			try {
				await bd.prepare(
					`INSERT INTO aparelho (dia, total, novos) VALUES (?, 1, ?)
					 ON CONFLICT (dia) DO UPDATE SET total = total + 1, novos = novos + ?`
				)
					.bind(dia, novo, novo)
					.run();
			} catch {
				// uma contagem perdida não é motivo para nada
			}
		})()
	);
	return resposta;
}
