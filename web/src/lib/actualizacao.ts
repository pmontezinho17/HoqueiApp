/**
 * Decidir se uma actualização se anuncia ou se aplica em silêncio.
 *
 * ## O defeito que isto fecha, medido e não suposto
 *
 * O aviso de "há uma versão nova" aparece sempre que o service worker vê um build diferente.
 * A 10/10/2026 corrigimos a metade óbvia disso — o build não era determinista, e **código
 * igual** produzia manifestos diferentes, por isso cada publicação interrompia todos. Ficou a
 * outra metade: **código invisível** continua a anunciar-se.
 *
 * Medido a 12/10/2026, com um interruptor realista desligado — uma linha no menu que ninguém
 * vê — e duas construções seguidas: **7 das 123 entradas do manifesto mudaram de revisão, e 2
 * entraram e saíram**. O service worker acende o aviso, e a app está exactamente igual.
 *
 * Isto deixa de ser um incómodo e passa a ser um problema no dia em que se começa a usar
 * interruptores a sério — ver `bandeiras.ts`. Cada funcionalidade que entra desligada
 * interrompe todos os utilizadores para lhes dizer que nada mudou, e é assim que se ensina
 * alguém a fechar avisos sem ler.
 *
 * ## A regra
 *
 * A versão é a única coisa que diz se houve alteração **para quem usa** — é a regra do
 * `versao.ts`: quem publica decide, ao subir o número, se aquilo vale uma interrupção. Então:
 *
 * * a versão publicada é **igual** à que esta app tem → aplica-se em silêncio;
 * * é **diferente** → pergunta-se, como antes;
 * * **não se consegue saber** → pergunta-se. Sem rede, ou com o ficheiro em falta, o
 *   comportamento certo é o antigo: mais vale um aviso a mais do que uma app que nunca se
 *   actualiza porque uma verificação falhou em silêncio.
 *
 * O `/versao.json` que se lê é **gerado na construção** a partir da mesma constante que vai no
 * pacote — ver o `vite.config.ts`. Não é um ficheiro escrito à mão ao lado, porque isso era uma
 * segunda casa para a mesma verdade e um dia iam discordar.
 *
 * ## O que está verificado, e o que não está
 *
 * Verificado: a decisão, com todos os casos de falha, no `actualizacao.test.ts`; que o
 * `/versao.json` sai da construção com o número certo, é servido, e **não** entra na pré-cache
 * do service worker (medido no `build/sw.js`); e que o `updateServiceWorker(reloadPage?)` aceita
 * mesmo o `false`, lido dos tipos instalados.
 *
 * **Não verificado de ponta a ponta:** que o `needRefresh` leva a este caminho. Não consegui
 * pôr o `vite preview` a produzir um service worker em espera — num recarregamento completo o
 * novo activa logo, e o `registration.update()` não trouxe nenhum. O aviso só aparece com a
 * página aberta enquanto o servidor muda, e isso vê-se a sério no site de testes: publica-se,
 * deixa-se a app aberta, publica-se outra vez com uma alteração invisível, e olha-se. Fica dito
 * em vez de ser dado por feito.
 */

export type Decisao = 'calar' | 'perguntar';

/**
 * Função pura, e é onde vive a decisão toda.
 *
 * @param nossa a versão compilada nesta app
 * @param publicada a que está no site agora, ou `null` se não se conseguiu ler
 */
export function decidirAviso(nossa: string, publicada: string | null): Decisao {
	if (publicada === null) return 'perguntar';
	return publicada === nossa ? 'calar' : 'perguntar';
}

/** Onde vive o número da versão publicada. Fora de `/v1/`, de propósito — ver abaixo. */
export const CAMINHO_VERSAO = '/versao.json';

/**
 * Lê a versão que está publicada agora, ou `null`.
 *
 * **Três cuidados, e os três têm razão de ser:**
 *
 * 1. `cache: 'no-store'` e o cabeçalho igual no `_headers`. Um número de versão servido da
 *    cache responde a pergunta errada — a de há cinco minutos.
 * 2. **Fora de `/v1/`**, senão a regra de `StaleWhileRevalidate` do service worker apanhava-o
 *    e devolvia a cópia antiga, que é precisamente o que faria esta verificação mentir. E não
 *    é `.html`, `.js` nem nada que o `globPatterns` pré-guarde.
 * 3. Qualquer erro devolve `null` e não estoura. Isto corre quando o service worker avisa, e
 *    um erro aqui não pode impedir uma actualização de acontecer.
 */
export async function versaoPublicada(
	buscar: typeof fetch = fetch,
	caminho = CAMINHO_VERSAO
): Promise<string | null> {
	try {
		const r = await buscar(caminho, { cache: 'no-store' });
		if (!r.ok) return null;
		const d: unknown = await r.json();
		const v = (d as { versao?: unknown })?.versao;
		return typeof v === 'string' && v.trim() !== '' ? v : null;
	} catch {
		return null;
	}
}
