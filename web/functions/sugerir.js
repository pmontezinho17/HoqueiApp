/**
 * Recebe uma sugestão da caixa "O que está mal" e guarda-a na D1.
 *
 * ## Porque é que isto existe, e porque é que o `Feedback.svelte` dizia que não devia
 *
 * Até 13/10/2026 a caixa montava um `mailto:` e era o programa de email da pessoa que enviava.
 * O cabeçalho do componente defendia essa escolha com duas razões: *"não há servidor nem
 * recolha"*, e *"não vale a pena para uma funcionalidade que sai daqui a umas semanas"*.
 *
 * O dono mudou os dois termos dessa conta. Pediu um processo automático — a sugestão a virar
 * registo no GitHub sem ninguém copiar nada — e, com isso, o botão de opinião deixou de ser
 * temporário. A partir daí a conta dá ao contrário, e é esta Function.
 *
 * **O que não muda: o email fica.** O `info.ok4sticks@gmail.com` continua a ser o caminho de
 * quem tem uma dúvida ou um pedido, e é lá que a política de privacidade promete responder a
 * quem queira um nome removido. Uma sugestão não precisa de resposta, precisa de ser
 * registada; uma dúvida precisa de resposta. São dois caminhos para duas coisas.
 *
 * ## O que se guarda, e o que se recusa guardar
 *
 * O texto, o ecrã onde a pessoa estava e a versão da app. **Nem IP, nem identificador, nem
 * cabeçalhos** — é a mesma promessa que o contador de aparelhos cumpre, e quebrá-la aqui
 * tornaria falsa a página de privacidade.
 *
 * Isso tem um preço que convém dizer: **sem identificador não há limite por pessoa.** O que há
 * é um tecto diário global e um limite de tamanho. É mais grosseiro e protege menos — um
 * abusador consegue gastar o tecto do dia —, mas a alternativa era guardar quem é cada um,
 * ainda que por *hash*, e isso é precisamente o que não queremos.
 *
 * ## Porque é que cria a tabela
 *
 * O `CREATE TABLE IF NOT EXISTS` corre antes da escrita porque a ligação da D1 é o único
 * caminho que temos garantido: criar a tabela à mão exigiria o token da Cloudflare com âmbito
 * de D1, que o `dados.yml` pode não ter. Custa uma instrução por sugestão — a este volume, nada
 * — e dispensa um passo manual que alguém se esqueceria de fazer.
 */

/** O máximo que uma sugestão pode ter. Acima disto é recusada, e a caixa avisa antes. */
export const MAXIMO = 2000;

/** Quantas sugestões se aceitam por dia, no total. Ver o cabeçalho para o porquê de ser global. */
export const TECTO_DIARIO = 200;

const ESQUEMA = `CREATE TABLE IF NOT EXISTS sugestao (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  dia    TEXT NOT NULL,
  hora   TEXT NOT NULL,
  texto  TEXT NOT NULL,
  ecra   TEXT,
  versao TEXT,
  issue  INTEGER
)`;

/** A data e a hora de Lisboa, de uma só leitura do relógio — como no `/contar`. */
function agoraEmLisboa() {
	const s = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Lisbon' });
	return { dia: s.slice(0, 10), hora: s.slice(11, 19) };
}

/**
 * O que fazer com o que chegou. **Função pura, e é onde vive a decisão toda.**
 *
 * Devolve `{ aceitar, porque }`. O `porque` é para o log e para o teste; o que a pessoa vê é
 * só "guardado" ou "não deu", porque explicar-lhe o tecto diário é ensinar a contorná-lo.
 *
 * @param {unknown} corpo o JSON que chegou
 * @param {number} hoje quantas sugestões já entraram hoje
 */
export function decidir(corpo, hoje) {
	if (typeof corpo !== 'object' || corpo === null) return { aceitar: false, porque: 'corpo inválido' };
	const c = /** @type {Record<string, unknown>} */ (corpo);

	// A armadilha: um campo que a caixa envia sempre vazio. Um robô que preencha tudo o que
	// encontra tropeça aqui, e não custa um pedido nem um identificador a ninguém.
	if (typeof c.ok4 === 'string' && c.ok4 !== '') return { aceitar: false, porque: 'armadilha' };

	const texto = typeof c.texto === 'string' ? c.texto.trim() : '';
	if (!texto) return { aceitar: false, porque: 'sem texto' };
	if (texto.length > MAXIMO) return { aceitar: false, porque: `texto com ${texto.length} caracteres` };
	if (hoje >= TECTO_DIARIO) return { aceitar: false, porque: 'tecto diário atingido' };

	return {
		aceitar: true,
		porque: 'guardada',
		texto,
		ecra: typeof c.ecra === 'string' ? c.ecra.slice(0, 200) : null,
		versao: typeof c.versao === 'string' ? c.versao.slice(0, 20) : null
	};
}

/**
 * @param {{ request: Request, env: { DADOS?: import("@cloudflare/workers-types").D1Database } }} contexto
 */
export async function onRequestPost({ request, env }) {
	const bd = env?.DADOS;
	// Sem ligação à base de dados — o caso do ambiente de Preview — diz-se que não deu, para a
	// caixa poder oferecer o email como alternativa em vez de fingir que guardou.
	if (!bd) return new Response(null, { status: 503, headers: { 'Cache-Control': 'no-store' } });

	let corpo;
	try {
		corpo = await request.json();
	} catch {
		return new Response(null, { status: 400, headers: { 'Cache-Control': 'no-store' } });
	}

	const { dia, hora } = agoraEmLisboa();
	try {
		await bd.prepare(ESQUEMA).run();
		const { results } = await bd
			.prepare('SELECT COUNT(*) AS n FROM sugestao WHERE dia = ?')
			.bind(dia)
			.all();
		const hoje = Number(results?.[0]?.n ?? 0);

		const d = decidir(corpo, hoje);
		if (!d.aceitar) {
			console.log(`sugestão recusada: ${d.porque}`);
			// 400 e não 429 mesmo no tecto: a pessoa não tem nada a fazer com a diferença, e a
			// caixa trata os dois da mesma maneira — oferece o email.
			return new Response(null, { status: 400, headers: { 'Cache-Control': 'no-store' } });
		}

		await bd
			.prepare('INSERT INTO sugestao (dia, hora, texto, ecra, versao) VALUES (?, ?, ?, ?, ?)')
			.bind(dia, hora, d.texto, d.ecra, d.versao)
			.run();
		return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
	} catch (e) {
		console.log(`sugestão perdida: ${String(e).slice(0, 120)}`);
		return new Response(null, { status: 503, headers: { 'Cache-Control': 'no-store' } });
	}
}
