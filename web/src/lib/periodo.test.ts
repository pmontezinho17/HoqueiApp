import { describe, expect, it } from 'vitest';
import { diasEntre, periodoPedido, resumoDoPeriodo, somarDias } from './periodo.js';
import { pagina } from './consola';

/**
 * O período da vista de utilizadores. Pedido do dono a 26/10/2026 — *"só consigo ver o
 * histórico de uma semana, mas eu tenho dados de mais dias"*. O porquê de vir da base de dados
 * e não do observador está no `periodo.js`.
 */
const HOJE = '2026-10-26';
const PRIMEIRO = '2026-10-08';
const p = (q: string) => new URLSearchParams(q);

describe('o período pedido', () => {
	it('sem nada no endereço são os sete dias de sempre, a acabar hoje', () => {
		expect(periodoPedido(p(''), HOJE, PRIMEIRO)).toEqual({ de: '2026-10-20', ate: HOJE, atalho: '7' });
	});

	it('os atalhos: 30 dias e tudo, que começa no primeiro dia com contador', () => {
		expect(periodoPedido(p('periodo=30'), HOJE, PRIMEIRO).de).toBe('2026-09-27');
		expect(periodoPedido(p('periodo=tudo'), HOJE, PRIMEIRO)).toEqual({ de: PRIMEIRO, ate: HOJE, atalho: 'tudo' });
	});

	it('datas escolhidas à mão valem, e trocadas viram-se', () => {
		expect(periodoPedido(p('de=2026-10-10&ate=2026-10-17'), HOJE, PRIMEIRO)).toEqual({
			de: '2026-10-10', ate: '2026-10-17', atalho: null
		});
		expect(periodoPedido(p('de=2026-10-17&ate=2026-10-10'), HOJE, PRIMEIRO).de).toBe('2026-10-10');
	});

	it('nada passa de hoje: um dia futuro diria que ninguém usou a app', () => {
		expect(periodoPedido(p('de=2026-10-20&ate=2026-12-31'), HOJE, PRIMEIRO).ate).toBe(HOJE);
		expect(periodoPedido(p('de=2026-10-20'), HOJE, PRIMEIRO).ate).toBe(HOJE);
	});

	it('o que vier mal escrito cai nos sete dias, e não rebenta', () => {
		expect(periodoPedido(p('de=ontem&ate=hoje'), HOJE, PRIMEIRO).atalho).toBe('7');
		expect(periodoPedido(p('periodo=999'), HOJE, PRIMEIRO).atalho).toBe('7');
	});

	it('os dias do período, e o tecto contra um "de" de há dez anos', () => {
		expect(diasEntre('2026-10-30', '2026-11-02')).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
		expect(diasEntre('2016-01-01', HOJE)).toHaveLength(400);
		expect(somarDias('2026-03-28', 2)).toBe('2026-03-30'); // a mudança de hora não come um dia
	});
});

describe('o resumo do período', () => {
	const serie = [
		{ dia: '2026-10-07', aparelhos: 0, novos: 0 },
		{ dia: '2026-10-08', aparelhos: 100, novos: 90 },
		{ dia: '2026-10-17', aparelhos: 822, novos: 773 },
		{ dia: '2026-10-21', aparelhos: 190, novos: 40 }
	];

	it('soma entradas e novos, e a média e o pico contam só os dias com contador', () => {
		const r = resumoDoPeriodo(serie);
		expect(r).toMatchObject({ dias: 3, entradas: 1112, novos: 903, media: 371 });
		expect(r.pico).toEqual({ dia: '2026-10-17', aparelhos: 822 });
		expect(r.tipos).toBeNull();
	});

	it('o tipo de aparelho soma-se só nos dias em que já havia esse contador', () => {
		const r = resumoDoPeriodo(serie, { '2026-10-21': { aparelhos: 190, ios: 100, android: 80, computador: 10 } });
		expect(r.tipos).toEqual({ ios: 100, android: 80, computador: 10, outro: 0 });
		expect(r.diasComTipo).toBe(1);
	});
});

describe('a consola com período', () => {
	const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Lisbon' });
	const minimo = {
		dia: hoje, dias: [hoje], estado: null,
		rel: { cadencia_s: { mediana: null, minimo: null, maximo: null }, buracos_acima_de_3min: [],
			resultados: [], erros: [], publicacoes: 0, eventos: 0 },
		runs: [], diario: [], ent: {}, horas: {}, porDia: {}, sempre: null, entradasHora: {}
	};
	const periodo = {
		de: somarDias(hoje, -29), ate: hoje, atalho: '30', primeiro: somarDias(hoje, -18),
		ent: { [somarDias(hoje, -10)]: { aparelhos: 50, novos: 20, ios: 30, android: 20 } }
	};

	it('desenha um dia por linha em todo o período, e não só sete', () => {
		const html = pagina({ ...minimo, chave: 'abc', periodo });
		expect(html.match(/class="barra"/g)).toHaveLength(30);
		expect(html).toContain('<b>50</b> entradas em 1 dia');
		expect(html).toContain('iPhone <b>30</b>');
	});

	it('os atalhos e as datas levam a chave, e os outros links levam o período', () => {
		const html = pagina({ ...minimo, chave: 'abc', periodo });
		expect(html).toContain('href="?chave=abc&periodo=tudo"');
		expect(html).toContain('<input type="hidden" name="chave" value="abc">');
		// trocar de vista mantém os 30 dias
		expect(html).toMatch(/href="\?chave=abc&vista=sistema&periodo=30"/);
	});

	it('sem período — sem base de dados — desenha os sete do observador como antes', () => {
		const html = pagina({ ...minimo, dias: [hoje], ent: { [hoje]: { aparelhos: 5, novos: 1 } } });
		expect(html.match(/class="barra"/g)).toHaveLength(1);
		expect(html).not.toContain('class="periodo"');
	});
});
