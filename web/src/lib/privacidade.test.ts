import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * A página de privacidade enumera o que fica guardado no aparelho — e isso é uma promessa,
 * não uma descrição. **Uma chave nova que não apareça lá torna a página falsa no instante em
 * que é publicada.**
 *
 * Já aconteceu duas vezes. A primeira foi minha, a 06/10/2026: a página dizia uma chave e
 * havia duas, porque o `guia-visto` nasceu sem passar por lá. A segunda ia acontecer hoje, com
 * a chave da consola.
 *
 * O AGENTS.md diz "código e documento no mesmo commit quando o documento afirma algo sobre o
 * código", e dá esta página como exemplo. Isto é essa regra a deixar de depender de memória.
 *
 * **Varre o código e não uma lista escrita aqui**, pela mesma razão do teste do FAQ: uma lista
 * copiada para um teste tem exactamente o problema que o teste tenta resolver.
 */
describe('a política de privacidade enumera o que é guardado', () => {
	const pagina = readFileSync(
		new URL('../routes/privacidade/+page.svelte', import.meta.url),
		'utf-8'
	);

	/** Todos os ficheiros de código da app e das Functions. */
	function fontes(dir: URL): string[] {
		return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
			const filho = new URL(`${e.name}${e.isDirectory() ? '/' : ''}`, dir);
			if (e.isDirectory()) return fontes(filho);
			if (!/\.(ts|js|svelte)$/.test(e.name) || e.name.includes('.test.')) return [];
			return [readFileSync(filho, 'utf-8')];
		});
	}

	const codigo = [
		...fontes(new URL('../', import.meta.url)),
		...fontes(new URL('../../functions/', import.meta.url))
	].join('\n');

	// as chaves como elas aparecem no código: 'hoquei:…' ou 'ok4sticks:…'
	const chaves = [
		...new Set([...codigo.matchAll(/['"`]((?:hoquei|ok4sticks):[a-z0-9:-]+)['"`]/g)].map((m) => m[1]))
	];

	it('encontra chaves no código, senão este teste não diz nada', () => {
		expect(chaves.length).toBeGreaterThanOrEqual(5);
	});

	it('cada chave usada pelo código está escrita na página', () => {
		// a `CHAVE_ANTIGA` do guia é a excepção declarada: o código só a **apaga**, e uma
		// página de privacidade a enumerar uma chave que já não se escreve confundia mais do
		// que esclarecia
		const apagadas = new Set(['guia-visto']);
		const faltam = chaves.filter((c) => !apagadas.has(c) && !pagina.includes(c));
		expect(faltam).toEqual([]);
	});

	it('se guardarmos texto de outras pessoas, a página tem de o dizer', () => {
		/**
		 * **O guarda que o `localStorage` não cobria.** Os testes acima varrem as chaves que
		 * ficam no aparelho de quem usa; isto é outra coisa — desde 13/10/2026 guardamos texto
		 * **no servidor**, escrito por outras pessoas, e essa é a primeira vez que este projecto
		 * tem dados de alguém que não o próprio aparelho.
		 *
		 * Se a Function de sugestões existir e a página não a descrever, a página é falsa. E ao
		 * contrário de uma chave esquecida, isto não é uma imprecisão: é guardar texto de
		 * pessoas sem lhes dizer.
		 */
		if (!existsSync(new URL('../../functions/sugerir.js', import.meta.url))) return;
		for (const promessa of ['O que está mal', '180 dias', 'privado'])
			expect(pagina, promessa).toContain(promessa);
	});

	it('continua a prometer zero cookies, e nada no código escreve um', () => {
		expect(pagina).toMatch(/cookie/i);
		// `document.cookie` em qualquer sítio da app quebrava a promessa da página
		expect(codigo).not.toMatch(/document\.cookie\s*=/);
	});
});

describe('a política de privacidade declara os cabeçalhos que lemos', () => {
	const pagina = readFileSync(
		new URL('../routes/privacidade/+page.svelte', import.meta.url),
		'utf-8'
	);
	const contador = readFileSync(new URL('../../functions/contar.js', import.meta.url), 'utf-8');

	/**
	 * **A regra que faltava, e custou caro a 21/10/2026.**
	 *
	 * Nesse dia descobriu-se que produção servia o beacon da Web Analytics da Cloudflare
	 * enquanto a página dizia, nomeando-o, que ele não existia. Esse caso não se apanha aqui —
	 * o script não está no nosso código, e por isso a verificação dele é perguntar ao site, no
	 * `scripts/verificar_producao.py`.
	 *
	 * Este apanha o irmão: no mesmo dia o contador passou a **ler um cabeçalho**, o
	 * `User-Agent`, para dele guardar o tipo de aparelho. Até então não lia nenhum. Se um dia
	 * voltar a ler outro, ou deixar de ler este, a página tem de mudar no mesmo commit — e é
	 * isso que este teste obriga.
	 */
	it('se o contador lê o `User-Agent`, a página di-lo', () => {
		const le = /headers\.get\(['"]User-Agent['"]\)/i.test(contador);
		expect(le, 'o contador deixou de ler o User-Agent — se foi de propósito, tira a frase da página').toBe(true);
		expect(pagina).toMatch(/User-Agent/);
	});

	it('e diz o que guarda dele: um de quatro rótulos, não a cadeia', () => {
		for (const palavra of ['ios', 'android', 'computador', 'outro'])
			expect(pagina.toLowerCase()).toContain(palavra);
		// a promessa que distingue isto de rastreio: a cadeia não fica
		expect(pagina).toMatch(/não<\/strong>\s*se guarda|não.{0,20}se guarda/s);
	});

	it('não há outro cabeçalho a ser lido sem estar declarado', () => {
		// Qualquer `headers.get('X')` nas Functions que não seja um dos conhecidos obriga a rever
		// a página. Os conhecidos, e porque é que nenhum diz nada sobre **quem** visita:
		//
		//   user-agent     o único que descreve o aparelho — e é por isso que está declarado
		//   origin         distingue um pedido vindo do site de testes
		//   referer        rede do anterior
		//   cookie         a porta do site de testes, que guarda a chave e mais nada
		//   content-type   o formato do corpo de uma sugestão
		//   sec-fetch-mode distingue abrir uma página de ir buscar dados
		//   accept         rede do anterior, para browsers que não mandam o `Sec-Fetch-Mode`
		//
		// Os dois últimos apareceram quando este teste foi escrito, a 21/10/2026: eu não sabia
		// que eram lidos. Dizem respeito ao **tipo de pedido**, não a quem o faz — ver o
		// `_middleware.js`, onde servem para contar um ecrã aberto e para decidir se a porta do
		// site de testes aparece.
		const conhecidos = new Set([
			'user-agent',
			'origin',
			'referer',
			'cookie',
			'content-type',
			'sec-fetch-mode',
			'accept'
		]);
		const lidos = [
			...readFileSync(new URL('../../functions/_middleware.js', import.meta.url), 'utf-8')
				.matchAll(/headers\.get\(['"]([^'"]+)['"]\)/g),
			...contador.matchAll(/headers\.get\(['"]([^'"]+)['"]\)/g)
		].map((m) => m[1].toLowerCase());
		expect([...new Set(lidos)].filter((h) => !conhecidos.has(h))).toEqual([]);
	});
});
