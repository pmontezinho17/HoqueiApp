import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { diaDeLisboa, diaDeLisboaMais, diaInicial } from './dia';

/**
 * A hora em que isto se partia: a primeira hora do dia, em hora de verão.
 *
 * Apanhado pelo dono às 00:48 de sábado, 17/10/2026 — *"hoje é sábado e parece que ainda está na
 * sexta"*. A app usava `toISOString()`, que é UTC, e em WEST isso é o dia anterior até à 01:00.
 */
describe('o dia de Lisboa', () => {
	it('à meia-noite e meia de verão já é o dia novo, e o UTC ainda não', () => {
		// 2026-10-16T23:48Z = 00:48 de 17/10 em Lisboa (WEST, UTC+1)
		const instante = new Date('2026-10-16T23:48:00Z');
		expect(instante.toISOString().slice(0, 10)).toBe('2026-10-16'); // o defeito
		expect(diaDeLisboa(instante)).toBe('2026-10-17'); // a correcção
	});

	it('em hora de inverno os dois coincidem', () => {
		// Depois do último domingo de outubro Portugal volta a UTC+0. É por isto que o defeito
		// "desaparecia sozinho" — e voltava em finais de março.
		const instante = new Date('2026-11-16T23:48:00Z');
		expect(diaDeLisboa(instante)).toBe(instante.toISOString().slice(0, 10));
	});

	it('devolve sempre AAAA-MM-DD', () => {
		expect(diaDeLisboa(new Date('2026-01-05T12:00:00Z'))).toBe('2026-01-05');
		expect(diaDeLisboa(new Date('2026-12-31T12:00:00Z'))).toBe('2026-12-31');
	});

	it('somar dias atravessa a mudança de hora sem perder um dia', () => {
		// 25/10/2026 é o domingo da mudança: esse dia tem 25 horas. Somar dias ao instante e só
		// depois converter é o que aguenta isso; somar à string tratava todos os dias como 24 h.
		expect(diaDeLisboaMais(1, new Date('2026-10-24T12:00:00Z'))).toBe('2026-10-25');
		expect(diaDeLisboaMais(2, new Date('2026-10-24T12:00:00Z'))).toBe('2026-10-26');
		expect(diaDeLisboaMais(-1, new Date('2026-10-26T12:00:00Z'))).toBe('2026-10-25');
	});

	it('e atravessa a meia-noite de Lisboa, não a de UTC', () => {
		expect(diaDeLisboaMais(1, new Date('2026-10-16T23:48:00Z'))).toBe('2026-10-18');
	});
});

/**
 * E a pergunta fica em código: **nenhum ecrã volta a usar a data de UTC**.
 *
 * O review externo de 13/10 apontou sete ficheiros. Corrigir os sete é meia hora; o que impede
 * o oitavo é isto. Varre os ficheiros e não uma lista escrita aqui, pela mesma razão do teste da
 * política de privacidade: uma lista copiada para um teste tem o problema que o teste resolve.
 */
describe('ninguém usa a data de UTC para saber que dia é hoje', () => {
	const fontes = (dir: URL): { nome: string; texto: string }[] =>
		readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
			const filho = new URL(`${e.name}${e.isDirectory() ? '/' : ''}`, dir);
			if (e.isDirectory()) return fontes(filho);
			if (!/\.(ts|svelte)$/.test(e.name) || e.name.includes('.test.')) return [];
			return [{ nome: e.name, texto: readFileSync(filho, 'utf-8') }];
		});

	it('varre ficheiros que cheguem para isto significar alguma coisa', () => {
		expect(fontes(new URL('../', import.meta.url)).length).toBeGreaterThan(40);
	});

	it('nenhum deles chama toISOString para obter uma data', () => {
		const maus = fontes(new URL('../', import.meta.url))
			.filter((f) => f.nome !== 'dia.ts' && /toISOString\(\)\.slice\(0, ?10\)/.test(f.texto))
			.map((f) => f.nome);
		expect(maus).toEqual([]);
	});
});

describe('que dia abrir na lista de jogos', () => {
	const dias = ['2026-10-17', '2026-10-18', '2026-10-21', '2026-10-24', '2026-10-31'];
	const hoje = '2026-10-21';

	it('o dia pedido no endereço, quando existe na fita', () => {
		// É o caso que estava partido: voltar de um jogo de 31/10 caía em hoje.
		expect(diaInicial('2026-10-31', dias, hoje)).toBe('2026-10-31');
		expect(diaInicial('2026-10-17', dias, hoje)).toBe('2026-10-17');
	});

	it('sem dia pedido, o primeiro com jogos a partir de hoje', () => {
		expect(diaInicial(null, dias, hoje)).toBe('2026-10-21');
		expect(diaInicial(undefined, dias, hoje)).toBe('2026-10-21');
		expect(diaInicial('', dias, hoje)).toBe('2026-10-21');
	});

	it('hoje sem jogos salta para o próximo que tenha', () => {
		expect(diaInicial(null, dias, '2026-10-22')).toBe('2026-10-24');
	});

	it('um dia pedido fora da fita não vale — e aí vale a regra de hoje', () => {
		// Fora da janela de dias a fita não o tem, e abrir num dia que a fita não mostra deixava
		// a app num estado que o utilizador não consegue desfazer.
		expect(diaInicial('2026-12-25', dias, hoje)).toBe('2026-10-21');
	});

	it('passada a época toda, abre no último dia com jogos', () => {
		expect(diaInicial(null, dias, '2026-11-30')).toBe('2026-10-31');
	});

	it('sem dias nenhuns devolve vazio em vez de rebentar', () => {
		expect(diaInicial('2026-10-31', [], hoje)).toBe('');
		expect(diaInicial(null, [], hoje)).toBe('');
	});
});
