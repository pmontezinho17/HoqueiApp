/**
 * De uma linha da tabela `sugestao` para o título e o corpo do registo no GitHub.
 *
 * ## Porque é que isto é um ficheiro e não três `node -e` dentro do YAML
 *
 * Era isso que era, e a 13/10/2026 escrevi no backlog que tinha "testado a geração do título e
 * do corpo à mão, com aspas, acentos e mudanças de linha". Testar à mão uma coisa que vai correr
 * todos os dias às 07:20 é deixar a verificação de fora do que se publica: na vez em que partir,
 * parte sozinha, de madrugada, sobre o texto de outra pessoa.
 *
 * Aqui é código com teste. O YAML passa a chamar isto, e o que entra no registo é o mesmo que
 * antes — o formato não mudou, para o arquivo não ficar com duas formas.
 *
 * ## O que é de propósito
 *
 * **O texto da pessoa vai primeiro e inteiro.** Nada de reflow, de cortes nem de escapes: é a
 * única parte do registo que não é nossa, e o Markdown do GitHub trata-a bem como está. O que é
 * nosso vem depois do `---`, numa tabela.
 *
 * **O título é derivado e não escolhido.** Primeira linha útil, espaços normalizados, 60
 * caracteres. Ninguém inventa um resumo do que a pessoa escreveu — isso seria pôr palavras na
 * boca dela num sítio onde ela não pode responder.
 */

/** O máximo que um título leva, com reticências a contar. É o que cabe na lista do GitHub. */
export const TITULO_MAXIMO = 60;

/**
 * O título: a primeira linha útil do texto, em espaços simples, cortada aos 60.
 *
 * Um texto só com espaços, ou vazio, dá um título que ainda assim diz alguma coisa — o GitHub
 * recusa criar uma issue sem título, e uma sugestão perdida por isso era o pior desfecho.
 *
 * @param {{ texto?: string | null, id?: number | string }} s
 */
export function titulo(s) {
	const t = (s.texto ?? '').replace(/\s+/g, ' ').trim();
	if (!t) return `Sugestão sem texto (${s.id ?? '?'})`;
	// `- 1` e não `- 3`: as reticências são **um** caracter, `…`, e não três pontos. A versão
	// dentro do YAML cortava aos 57 e somava `…`, o que dava títulos de 58 com um limite
	// anunciado de 60. Ninguém reparou porque isto nunca chegou a correr.
	return t.length > TITULO_MAXIMO ? `${t.slice(0, TITULO_MAXIMO - 1)}…` : t;
}

/**
 * O corpo: o texto da pessoa, e depois o que nós sabemos sobre de onde veio.
 *
 * @param {{ texto?: string | null, dia?: string, hora?: string, ecra?: string | null,
 *           versao?: string | null, id?: number | string }} s
 */
export function corpo(s) {
	return [
		s.texto ?? '',
		'',
		'---',
		'',
		'| | |',
		'|---|---|',
		`| quando | ${s.dia} às ${s.hora} |`,
		`| ecrã | \`${s.ecra || '—'}\` |`,
		`| versão | ${s.versao || '—'} |`,
		`| id na D1 | ${s.id} |`,
		'',
		'Arquivado pelo `sugestoes.yml`. Quando isto virar trabalho, o registo',
		'público vai para o `HoqueiApp` escrito pelas nossas palavras — aqui ficam as',
		'da pessoa, e é por isso que este repositório é privado.'
	].join('\n');
}

/**
 * O que o `wrangler d1 execute --json` devolveu, reduzido às linhas.
 *
 * **Distingue "não há nada" de "não se conseguiu ler", e essa é a razão de existir.** Medido a
 * 13/10/2026 contra a base de produção, onde a tabela ainda não existia: o wrangler escreve no
 * stdout um objecto `{ error: … }` com `no such table: sugestao` e **sai com erro**. O passo
 * antigo mandava isso para um ficheiro, via que o ficheiro não estava vazio, e seguia — o
 * `?? []` dava zero linhas e a corrida dizia *"0 sugestões por arquivar"*. Verde, e a dizer que
 * não havia nada quando o que houve foi uma falha.
 *
 * É a mesma classe de problema dos avisos que não fechavam: não é perder dados, é **perder o
 * sinal**. Uma corrida que diz zero por engano ensina a não olhar para o número.
 *
 * @param {unknown} json
 * @returns {{ linhas: Array<Record<string, unknown>> } | { erro: string }}
 */
export function linhasDoWrangler(json) {
	const d = /** @type {any} */ (Array.isArray(json) ? json[0] : json);
	if (d && typeof d === 'object' && d.error) {
		const notas = Array.isArray(d.error.notes)
			? d.error.notes.map((/** @type {{text?: string}} */ n) => n?.text).filter(Boolean)
			: [];
		return { erro: [d.error.text, ...notas].filter(Boolean).join(' · ') || 'erro sem texto' };
	}
	if (!d || !Array.isArray(d.results)) {
		return { erro: 'resposta sem `results` — o formato do wrangler mudou?' };
	}
	return { linhas: d.results };
}

// ───────────────────────────────────────────────────────────────────────────────────────────
// A linha de comando que o workflow usa:
//
//     node scripts/sugestao_para_registo.mjs <resposta.json> <pasta>
//
// Lê a resposta do wrangler, escreve `<pasta>/<id>.titulo` e `<pasta>/<id>.corpo.md` para cada
// linha, e imprime os ids, um por linha. Sai com 1 e uma mensagem no stderr quando a resposta é
// um erro — o workflow trata isso como aviso e não como "zero".

if (import.meta.url === `file://${process.argv[1]}`) {
	const { readFileSync, writeFileSync, mkdirSync } = await import('node:fs');
	const [ficheiro, pasta] = process.argv.slice(2);
	if (!ficheiro || !pasta) {
		console.error('uso: sugestao_para_registo.mjs <resposta.json> <pasta>');
		process.exit(2);
	}
	const lido = linhasDoWrangler(JSON.parse(readFileSync(ficheiro, 'utf-8')));
	if ('erro' in lido) {
		console.error(lido.erro);
		process.exit(1);
	}
	mkdirSync(pasta, { recursive: true });
	for (const s of lido.linhas) {
		writeFileSync(`${pasta}/${s.id}.titulo`, titulo(s));
		writeFileSync(`${pasta}/${s.id}.corpo.md`, corpo(s));
		console.log(String(s.id));
	}
}
