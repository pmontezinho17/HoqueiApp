/**
 * O contador de aparelhos distintos por dia.
 *
 * Recebe **um toque por aparelho e por dia** — é o cliente que decide, com uma data guardada
 * no próprio aparelho; ver `src/lib/presenca.ts`. Aqui não se lê nem se guarda nada sobre
 * quem tocou: nem IP, nem cabeçalhos, nem identificador. Só se soma um.
 *
 * Duas chaves por dia:
 *
 *     d:2026-10-08   → aparelhos distintos
 *     n:2026-10-08   → destes, quantos abriam a app pela primeira vez
 *
 * Escritas no KV: duas por aparelho novo e uma por aparelho conhecido, por dia. Com dezenas
 * de aparelhos é nada contra as 1 000 do plano gratuito — e ao contrário do contador de
 * ecrãs, este **não** cresce com o uso de cada um: quem abre a app vinte vezes num dia
 * escreve uma vez.
 */

const diaDeLisboa = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Lisbon' });

/** @param {{ chave: string, env: { CONTAGENS?: { get(k: string): Promise<string | null>, put(k: string, v: string, o?: { expirationTtl?: number }): Promise<void> } } }} _ */
async function somar(env, chave) {
	const antes = Number(await env.CONTAGENS.get(chave)) || 0;
	await env.CONTAGENS.put(chave, String(antes + 1), { expirationTtl: 60 * 60 * 24 * 400 });
}

/**
 * @param {{ request: Request, env: { CONTAGENS?: { get(k: string): Promise<string | null>, put(k: string, v: string, o?: { expirationTtl?: number }): Promise<void> } }, waitUntil: (p: Promise<unknown>) => void }} contexto
 */
export async function onRequestGet({ request, env, waitUntil }) {
	// 204 sempre, e sem corpo: isto não devolve informação nenhuma a quem chama, e assim um
	// erro do nosso lado nunca aparece no ecrã de ninguém
	const resposta = new Response(null, {
		status: 204,
		headers: { 'Cache-Control': 'no-store' }
	});
	if (!env?.CONTAGENS) return resposta;

	const novo = new URL(request.url).searchParams.get('novo') === '1';
	const dia = diaDeLisboa();
	waitUntil(
		(async () => {
			try {
				await somar(env, `d:${dia}`);
				if (novo) await somar(env, `n:${dia}`);
			} catch {
				// uma contagem perdida não é motivo para nada
			}
		})()
	);
	return resposta;
}
