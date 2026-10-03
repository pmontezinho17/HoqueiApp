import { type Dirent, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Guarda contra a regressão que o primeiro screenshot de iPhone revelou.
 *
 * O Safari do iPhone **amplia a página inteira** quando se foca um campo cuja letra tem
 * menos de 16px. O efeito não parece um problema de tipografia: a app aparece cortada à
 * direita, e foi assim que chegou — eu li o screenshot como overflow e andei a medir
 * larguras durante dez minutos antes de perceber que o conteúdo cabia e a página é que
 * estava ampliada.
 *
 * Não há forma de isto aparecer num teste de comportamento, por isso é um teste ao código:
 * qualquer regra que ponha um campo de formulário abaixo de 1rem falha aqui.
 */
const SRC = new URL('..', import.meta.url).pathname;

function ficheiros(pasta: string): string[] {
	return readdirSync(pasta, { withFileTypes: true }).flatMap((e: Dirent) =>
		e.isDirectory()
			? ficheiros(join(pasta, e.name))
			: e.name.endsWith('.svelte')
				? [join(pasta, e.name)]
				: []
	);
}

/** `select { … font-size: 0.8rem … }` → o valor, quando a regra é de um campo. */
function tamanhosDeCampo(css: string): { regra: string; rem: number }[] {
	const achados: { regra: string; rem: number }[] = [];
	// regras cujo seletor é (ou inclui) input/select/textarea à cabeça
	const re = /(^|\})\s*([^{}]*\b(?:input|select|textarea)\b[^{}]*)\{([^}]*)\}/g;
	for (const [, , seletor, corpo] of css.matchAll(re)) {
		if (seletor.includes('@')) continue;
		const m = corpo.match(/font-size:\s*([\d.]+)(rem|px|em)/);
		if (!m) continue;
		const [, valor, unidade] = m;
		const rem = unidade === 'px' ? Number(valor) / 16 : Number(valor);
		achados.push({ regra: `${seletor.trim()} { font-size: ${valor}${unidade} }`, rem });
	}
	return achados;
}

describe('campos de formulário', () => {
	it('nenhum desce abaixo de 16px, para o iPhone não ampliar a página', () => {
		const pequenos: string[] = [];
		for (const f of ficheiros(SRC)) {
			const css = readFileSync(f, 'utf8').split('<style>')[1] ?? '';
			for (const { regra, rem } of tamanhosDeCampo(css)) {
				if (rem < 1) pequenos.push(`${f.replace(SRC, '')}: ${regra}`);
			}
		}
		expect(pequenos, 'abaixo de 1rem faz o Safari ampliar ao focar').toEqual([]);
	});

	it('o próprio detector funciona', () => {
		// senão um teste que não detecta nada passa para sempre
		expect(tamanhosDeCampo('select { font-size: 0.8rem; }')).toEqual([
			{ regra: 'select { font-size: 0.8rem }', rem: 0.8 }
		]);
		expect(tamanhosDeCampo('input { font-size: 14px; }')[0].rem).toBeCloseTo(0.875);
		expect(tamanhosDeCampo('.linha { font-size: 0.7rem; }')).toEqual([]);
	});
});
