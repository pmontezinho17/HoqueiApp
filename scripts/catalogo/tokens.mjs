/**
 * Lê os *tokens* de desenho de onde eles vivem, em vez de os copiar para aqui.
 *
 * Uma segunda lista de cores escrita à mão num documento fica errada no dia em que alguém
 * mexe numa — e um catálogo que mente sobre a cor é pior do que não haver catálogo. Isto lê
 * o bloco `:root` do `+layout.svelte` e a paleta do `cor.svelte.ts`, e rebenta se não
 * encontrar o que espera.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'web');

/** Os pares `--nome: valor` dentro de um bloco de CSS. */
function declaracoes(bloco) {
	const fora = new Map();
	for (const [, nome, valor] of bloco.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
		fora.set(nome, valor.trim());
	}
	return fora;
}

/** O corpo de um bloco, a contar das chavetas equilibradas a partir de um índice. */
function corpo(texto, desde) {
	const abre = texto.indexOf('{', desde);
	let nivel = 0;
	for (let i = abre; i < texto.length; i++) {
		if (texto[i] === '{') nivel++;
		else if (texto[i] === '}' && --nivel === 0) return texto.slice(abre + 1, i);
	}
	throw new Error('bloco sem fecho');
}

export function lerTokens() {
	const esquema = readFileSync(join(WEB, 'src/routes/+layout.svelte'), 'utf8');

	const iClaro = esquema.indexOf(':global(:root)');
	const iEscuro = esquema.indexOf(":global(:root[data-tema='escuro'])");
	if (iClaro < 0 || iEscuro < 0) throw new Error('não encontrei os blocos de tokens no +layout.svelte');

	const claro = declaracoes(corpo(esquema, iClaro));
	const escuro = declaracoes(corpo(esquema, iEscuro));
	if (claro.size < 20) throw new Error(`só li ${claro.size} tokens no tema claro — o bloco mudou de forma?`);

	return { claro, escuro };
}

/** A paleta de acentos à escolha de quem usa a app. */
export function lerCores() {
	const fonte = readFileSync(join(WEB, 'src/lib/cor.svelte.ts'), 'utf8');
	const cores = [
		...fonte.matchAll(
			/\{ valor: '(\w+)', rotulo: '([^']+)', claro: '(#\w+)', escuro: '(#\w+)',\s*fracoClaro: '(#\w+)', fracoEscuro: '(#\w+)' \}/g
		)
	].map(([, valor, rotulo, claro, escuro, fracoClaro, fracoEscuro]) => ({
		valor, rotulo, claro, escuro, fracoClaro, fracoEscuro
	}));
	if (cores.length < 6) throw new Error(`só li ${cores.length} cores no cor.svelte.ts`);
	return cores;
}

/** A versão da app, para o catálogo dizer de quando é. */
export function lerVersao() {
	const m = readFileSync(join(WEB, 'src/lib/versao.ts'), 'utf8').match(/export const VERSAO = '([^']+)'/);
	if (!m) throw new Error('não encontrei a VERSAO');
	return m[1];
}

/** Os escalões que têm crachá próprio, pela lista que o componente reconhece. */
export function lerEscaloes() {
	const fonte = readFileSync(join(WEB, 'src/lib/CrachaEscalao.svelte'), 'utf8');
	const bloco = fonte.match(/const CONHECIDOS = new Set\(\[([\s\S]*?)\]\)/);
	if (!bloco) throw new Error('não encontrei os escalões conhecidos');
	return [...bloco[1].matchAll(/'([\w-]+)'/g)].map(([, s]) => s);
}
