/**
 * O contador de aparelhos distintos por dia.
 *
 * Recebe **um toque por aparelho e por dia** — é o cliente que decide, com uma data guardada
 * no próprio aparelho; ver `src/lib/presenca.ts`. Aqui não se lê nem se guarda nada sobre
 * quem tocou: nem IP, nem cabeçalhos, nem identificador. Só se soma um.
 *
 Uma linha por dia na tabela `aparelho`, e uma por hora na `entrada_hora`:
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
 *
 * ## E passa a receber sessões
 *
 * Com `?sessao=1`, soma uma linha em `visita` com o ecrã `sessao`. É o substituto do contador
 * de `aberturas`, que morreu a 13/10 quando o `/v1/*` saiu do caminho das Functions para não
 * voltar a esgotar a quota e derrubar produção. **Não é o mesmo número**: o antigo era uma
 * estimativa amostrada 1 em 10 dos pedidos de dados, e misturava uma app esquecida no bolso
 * com alguém a usá-la; este é exacto e quer dizer uma coisa só — a app foi aberta, ou
 * retomada depois de meia hora parada. Por isso vai para uma chave nova e o histórico do
 * `aberturas` fica a dizer o que dizia — somar os dois seria somar uma estimativa amostrada
 * com uma contagem.
 */

/**
 * Nós próprios. **Não se conta quem está a verificar se isto funciona.**
 *
 * O mesmo padrão que o `_middleware.js` já usava para o contador de ecrãs, e que aqui faltava.
 * O prefixo `hoqueiAPP` é comum a todos os nossos agentes: o `User-Agent` identificável existe
 * desde o início para a fonte saber quem a visita, e serve aqui para o contador saber quem
 * **não** contar.
 *
 * ## O que isto custou, medido a 15/10/2026
 *
 * O dono olhou para a consola às 07:53 e não acreditou: *"durante a noite foram vistos várias
 * vezes a aplicação? Tenho muitas dúvidas."* Tinha razão. As 16 "entradas" daquela madrugada
 * eram **a nossa vigia**: o `scripts/verificar_producao.py` sonda o `/contar?novo=0` para saber
 * se as Functions correm, e corre de quinze em quinze minutos pelo `saude.yml` mais uma vez por
 * cada publicação do `dados.yml`. Contado nessa manhã: **15 corridas de sonda contra 16 entradas
 * registadas**, hora a hora com a mesma forma — 1 em cada hora da noite, 2 a 4 nas pontas — e as
 * diferenças de ±1 explicam-se pelo tempo que cada corrida demora a chegar ao passo da sonda.
 *
 * E o sinal que o denuncia estava à vista: **zero "pela primeira vez"**. A sonda manda sempre
 * `novo=0`, logo inflaciona o total e nunca os novos. Vê-se na série diária: 40 aparelhos a
 * 12/10, e **84 a 13/10**, que é o dia em que a vigia de quinze minutos nasceu, com os novos a
 * cair de 14 para 11 no mesmo dia.
 *
 * A lição estava escrita no `_middleware.js` desde 09/10 — *"um número que cresce quando
 * olhamos mais para ele"* — e eu acrescentei a sonda a 13/10 sem a aplicar aqui.
 */
const NOSSO = /^hoqueiAPP/i;

/** O dia **e a hora** de Lisboa, de uma só leitura do relógio: às 23:59:59.9 duas leituras
 *  separadas podiam cair em dias diferentes e escrever a hora 0 no dia de ontem. */
function agoraEmLisboa() {
	const s = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Lisbon' });
	return { dia: s.slice(0, 10), hora: Number(s.slice(11, 13)) };
}

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

	// **204 e não conta.** A sonda precisa do 204 para saber que a Function corre; o que não
	// pode é ficar registada como gente. Ver o `NOSSO` acima.
	if (NOSSO.test(request.headers.get('User-Agent') ?? '')) return resposta;

	const parametros = new URL(request.url).searchParams;

	// **Uma sessão é outra contagem e escreve noutro sítio.** Ver `lib/presenca.ts`: o cliente
	// toca aqui quando a app é aberta ou retomada depois de meia hora parada. Não mexe no
	// `aparelho`, que é uma vez por dia — somar as duas coisas na mesma linha tornava ambas
	// ilegíveis.
	if (parametros.get('sessao') === '1') {
		waitUntil(
			(async () => {
				try {
					await bd
						.prepare(
							`INSERT INTO visita (dia, ecra, n) VALUES (?, 'sessao', 1)
							 ON CONFLICT (dia, ecra) DO UPDATE SET n = n + 1`
						)
						.bind(agoraEmLisboa().dia)
						.run();
				} catch {
					// uma contagem perdida não é motivo para nada
				}
			})()
		);
		return resposta;
	}

	const novo = parametros.get('novo') === '1' ? 1 : 0;
	const { dia, hora } = agoraEmLisboa();
	waitUntil(
		(async () => {
			try {
				// As duas escritas numa `batch`: ou entram as duas ou não entra nenhuma. A soma
				// das horas de um dia é, por construção, o total desse dia — e se alguma vez
				// divergirem é porque uma escrita falhou, o que é informação e não ruído.
				await bd.batch([
					bd
						.prepare(
							`INSERT INTO aparelho (dia, total, novos) VALUES (?, 1, ?)
							 ON CONFLICT (dia) DO UPDATE SET total = total + 1, novos = novos + ?`
						)
						.bind(dia, novo, novo),
					bd
						.prepare(
							`INSERT INTO entrada_hora (dia, hora, novos, volta) VALUES (?, ?, ?, ?)
							 ON CONFLICT (dia, hora) DO UPDATE
							   SET novos = novos + excluded.novos, volta = volta + excluded.volta`
						)
						.bind(dia, hora, novo, novo ? 0 : 1)
				]);
			} catch {
				// uma contagem perdida não é motivo para nada
			}
		})()
	);
	return resposta;
}
