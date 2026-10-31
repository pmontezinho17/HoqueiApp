import { readFileSync, readdirSync } from 'node:fs';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { diaDeLisboa, diaDeLisboaMais, diaInicial, horaNoAparelho, instanteDeLisboa } from './dia';
import { emCurso } from './formato';

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

/** Os `.ts` e `.svelte` da interface, sem os testes. */
const fontes = (dir: URL): { nome: string; texto: string }[] =>
	readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
		const filho = new URL(`${e.name}${e.isDirectory() ? '/' : ''}`, dir);
		if (e.isDirectory()) return fontes(filho);
		if (!/\.(ts|svelte)$/.test(e.name) || e.name.includes('.test.')) return [];
		return [{ nome: e.name, texto: readFileSync(filho, 'utf-8') }];
	});

/**
 * E a pergunta fica em código: **nenhum ecrã volta a usar a data de UTC**.
 *
 * O review externo de 13/10 apontou sete ficheiros. Corrigir os sete é meia hora; o que impede
 * o oitavo é isto. Varre os ficheiros e não uma lista escrita aqui, pela mesma razão do teste da
 * política de privacidade: uma lista copiada para um teste tem o problema que o teste resolve.
 */
describe('ninguém usa a data de UTC para saber que dia é hoje', () => {
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

/**
 * A hora de um jogo é de Lisboa, venha de que telemóvel vier.
 *
 * Apanhado pelo dono a 31/10/2026, com o telemóvel a marcar 09:33 quando em Lisboa eram 14:33:
 * seis jogos com a marca `ao_vivo` na agenda publicada e nenhuma secção "A decorrer agora". O
 * `new Date('2026-10-31T14:30:00')` lia a hora no fuso do aparelho.
 *
 * Os resultados esperados vêm escritos em UTC, com o `Z`, e por isso não dependem do fuso de
 * quem corre os testes — e o fuso do processo muda-se para o de Bogotá, a 5 horas de Lisboa como
 * o telemóvel do dono estava, para a suite apanhar o defeito em qualquer máquina. O Node relê o
 * `TZ` quando ele muda; medido a 31/10/2026, o `new Date('2026-10-31T14:30:00')` antigo dava
 * 19:30Z com este fuso, e o teste do "a decorrer" falhava.
 */
describe('o instante de um jogo', () => {
	const fusoOriginal = process.env.TZ;
	beforeAll(() => {
		process.env.TZ = 'America/Bogota';
	});
	afterAll(() => {
		if (fusoOriginal === undefined) delete process.env.TZ;
		else process.env.TZ = fusoOriginal;
	});
	afterEach(() => vi.useRealTimers());

	it('o processo está mesmo noutro fuso', () => {
		expect(new Date('2026-10-31T14:30:00').toISOString()).toBe('2026-10-31T19:30:00.000Z');
	});

	it('no inverno a hora de Lisboa é a de UTC', () => {
		expect(instanteDeLisboa('2026-10-31', '14:30')).toBe(Date.parse('2026-10-31T14:30:00Z'));
	});

	it('no verão é uma hora antes em UTC', () => {
		expect(instanteDeLisboa('2026-10-17', '14:30')).toBe(Date.parse('2026-10-17T13:30:00Z'));
	});

	it('aguenta os dois lados do domingo da mudança de hora', () => {
		// 25/10/2026: às 02:00 de verão os relógios voltaram à 01:00 de inverno
		expect(instanteDeLisboa('2026-10-25', '00:30')).toBe(Date.parse('2026-10-24T23:30:00Z'));
		expect(instanteDeLisboa('2026-10-25', '10:00')).toBe(Date.parse('2026-10-25T10:00:00Z'));
		// 29/03/2026: à 01:00 de inverno saltou-se para as 02:00 de verão
		expect(instanteDeLisboa('2026-03-29', '00:30')).toBe(Date.parse('2026-03-29T00:30:00Z'));
		expect(instanteDeLisboa('2026-03-29', '10:00')).toBe(Date.parse('2026-03-29T09:00:00Z'));
	});

	it('aceita a hora com segundos, como às vezes vem da fonte', () => {
		expect(instanteDeLisboa('2026-10-31', '14:30:00')).toBe(Date.parse('2026-10-31T14:30:00Z'));
	});

	it('um jogo das 14:30 marcado ao vivo está a decorrer às 14:33 de Lisboa', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-10-31T14:33:00Z'));
		expect(emCurso({ ao_vivo: true, data: '2026-10-31', hora: '14:30' })).toBe(true);
		expect(emCurso({ ao_vivo: true, data: '2026-10-31', hora: '15:00' })).toBe(false);
	});

	it('nenhum ficheiro lê a hora de um jogo no fuso do aparelho', () => {
		const maus = fontes(new URL('../', import.meta.url))
			.filter((f) => /new Date\(`\$\{[^}]+\}T\$\{/.test(f.texto))
			.map((f) => f.nome);
		expect(maus).toEqual([]);
	});
});

describe('a hora do jogo no fuso do aparelho', () => {
	it('em Lisboa, nos Açores e em Bogotá', () => {
		expect(horaNoAparelho('2026-10-31', '15:45', 'Europe/Lisbon')).toBeNull();
		expect(horaNoAparelho('2026-10-31', '15:45', 'Atlantic/Madeira')).toBeNull();
		expect(horaNoAparelho('2026-10-31', '15:45', 'Atlantic/Azores')).toEqual({ hora: '14:45', dias: 0 });
		// o telemóvel do dono a 31/10/2026
		expect(horaNoAparelho('2026-10-31', '15:45', 'America/Bogota')).toEqual({ hora: '10:45', dias: 0 });
	});

	it('o mesmo relógio noutro fuso não leva segunda hora', () => {
		// Londres no inverno está à hora de Lisboa; no verão também — os dois mudam juntos
		expect(horaNoAparelho('2026-11-07', '12:30', 'Europe/London')).toBeNull();
		expect(horaNoAparelho('2026-05-09', '12:30', 'Europe/London')).toBeNull();
	});

	it('acompanha a mudança de hora de cada lado', () => {
		// 25/10/2026 Lisboa passou a UTC+0; Nova Iorque só muda a 01/11
		expect(horaNoAparelho('2026-10-31', '15:00', 'America/New_York')).toEqual({ hora: '11:00', dias: 0 });
		expect(horaNoAparelho('2026-11-07', '15:00', 'America/New_York')).toEqual({ hora: '10:00', dias: 0 });
	});

	it('diz quando o dia local é outro', () => {
		expect(horaNoAparelho('2026-10-31', '20:15', 'Asia/Macau')).toEqual({ hora: '04:15', dias: 1 });
		expect(horaNoAparelho('2026-10-31', '00:30', 'America/Sao_Paulo')).toEqual({ hora: '21:30', dias: -1 });
	});

	it('aceita a hora com segundos, e nada sem data ou hora', () => {
		expect(horaNoAparelho('2026-10-31', '15:45:00', 'America/Bogota')?.hora).toBe('10:45');
		expect(horaNoAparelho('2026-10-31', null, 'America/Bogota')).toBeNull();
		expect(horaNoAparelho(null, '15:45', 'America/Bogota')).toBeNull();
	});
});
