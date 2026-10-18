/**
 * Tira os 26 ícones de dentro do `Icone.svelte` e escreve-os como SVG soltos.
 *
 * ## Porquê um script e não uma pasta de ficheiros
 *
 * Os ícones vivem todos dentro de um `{#if}` no `web/src/lib/Icone.svelte`, e é lá que têm
 * de continuar a viver: é o que garante que são desenho em linha, sem um tipo de letra de
 * ícones nem um pedido a terceiros — o que a página de privacidade afirma por escrito.
 *
 * Uma pasta de SVG commitada ao lado seria uma segunda cópia a envelhecer. Este script
 * gera-a a partir da única cópia que existe, e por isso pode ser deitada fora e refeita a
 * cada ronda com o designer. Contando três rondas — que é o mínimo em *"alterações
 * progressivas"* —, extrair à mão 26 ícones três vezes custa mais do que escrever isto.
 *
 *     node scripts/catalogo/exportar_icones.mjs
 *
 * ## O contrato que o designer tem de respeitar para o trabalho dele entrar
 *
 * Cada ícone é uma grelha de **20×20**, traço de **1,8**, pontas e juntas redondas, e a cor
 * vem de `currentColor` — nunca escrita no desenho. Um ícone com `fill` a sério, uma grelha
 * de 24, ou uma cor fixa, obriga a redesenhar em vez de colar.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const FONTE = join(AQUI, '..', '..', 'web', 'src', 'lib', 'Icone.svelte');
const DESTINO = join(AQUI, 'icones');

/** O cabeçalho do SVG, igual ao que o `Icone.svelte` escreve à volta de cada desenho. */
const ABRE = (nome) =>
	`<!-- ${nome} — ok4sticks. Grelha 20×20, traço 1,8, cor por currentColor. -->\n` +
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="20" height="20"\n' +
	'\tfill="none" stroke="currentColor" stroke-width="1.8"\n' +
	'\tstroke-linecap="round" stroke-linejoin="round">\n';

const fonte = readFileSync(FONTE, 'utf8');

// Cada ícone é um ramo `{#if nome === 'x'}` … até ao `{:else if}` seguinte ou ao `{/if}`.
// Um ramo pode servir mais do que um nome — a estrela cheia e a de contorno são o mesmo
// desenho com `fill` diferente, e é de propósito que são o mesmo desenho.
const ramos = [
	...fonte.matchAll(/\{[:#]?(?:else )?if ((?:nome === '[\w-]+'(?: \|\| )?)+)\}([\s\S]*?)(?=\{:else|\{\/if\})/g)
];
if (!ramos.length) throw new Error(`não encontrei ícones em ${FONTE} — o componente mudou de forma?`);

/**
 * Resolve as expressões do Svelte que restem no desenho, para o nome que se está a escrever.
 *
 * Só sabe resolver uma: `atributo={nome === 'x' ? 'a' : 'b'}`. Qualquer outra **rebenta** em
 * vez de escrever um SVG inválido em silêncio — um ícone partido que ninguém nota é pior do
 * que uma exportação que pára e diz qual.
 */
function semExpressoes(texto, nome) {
	const resolvido = texto.replace(
		/=\{nome === '([\w-]+)' \? '([^']*)' : '([^']*)'\}/g,
		(_, alvo, sim, nao) => `="${nome === alvo ? sim : nao}"`
	);
	const sobra = resolvido.match(/=\{[^}]*\}/);
	if (sobra) throw new Error(`${nome}: não sei resolver \`${sobra[0]}\` — resolve-o aqui à mão`);
	return resolvido;
}

rmSync(DESTINO, { recursive: true, force: true });
mkdirSync(DESTINO, { recursive: true });

const vistos = new Set();
for (const [, condicao, corpo] of ramos) {
	for (const [, nome] of condicao.matchAll(/nome === '([\w-]+)'/g)) {
		if (vistos.has(nome)) continue;
		vistos.add(nome);
		const desenho = semExpressoes(corpo, nome)
			.split('\n')
			.map((l) => l.replace(/^\t\t/, '\t'))
			.filter((l) => l.trim())
			.join('\n');
		writeFileSync(join(DESTINO, `${nome}.svg`), `${ABRE(nome)}${desenho}\n</svg>\n`);
	}
}

console.log(`${vistos.size} ícones em ${DESTINO}`);
console.log([...vistos].join(', '));
