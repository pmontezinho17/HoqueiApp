import { describe, expect, it } from 'vitest';
import { pagina } from './consola';

/**
 * A consola **desenha-se** — e isso não é óbvio só porque compila.
 *
 * Três vezes num dia a página partiu-se por razões que o `svelte-check` deixou passar e que
 * só apareciam ao abrir o browser:
 *
 * 1. **backticks dentro do template literal.** Um ``à volta de uma palavra`` num comentário
 *    de CSS fecha a string. Aconteceu três vezes, em três comentários diferentes;
 * 2. **uma variável usada antes de ser declarada** — um `const` não é içado, e o erro só
 *    nasce quando a função corre;
 * 3. **uma função que não existia** (`emLisboaCurto`), apanhada pelo tipo mas só porque
 *    calhou.
 *
 * Isto rende a página com dados mínimos e verifica que sai HTML inteiro. Não testa o
 * desenho; testa que há desenho.
 */
/**
 * **As datas são de hoje e não escritas à mão.** Estavam fixas em 2026-10-09 e o teste
 * passou nesse dia e falhou no seguinte: a página desenha links diferentes para "hoje" e para
 * um dia passado, e o fixture envelheceu de um dia para o outro. Um teste que depende da data
 * em que foi escrito mede o calendário, não o código.
 */
const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Lisbon' });
const seteDias = Array.from({ length: 7 }, (_, i) =>
	new Date(Date.parse(`${hoje}T12:00:00Z`) - (6 - i) * 86400000).toISOString().slice(0, 10)
);

const minimo = {
	dia: hoje,
	dias: seteDias,
	estado: null,
	rel: {
		cadencia_s: { mediana: null, minimo: null, maximo: null },
		buracos_acima_de_3min: [],
		resultados: [],
		erros: [],
		publicacoes: 0,
		eventos: 0
	},
	runs: [],
	diario: [],
	ent: {},
	horas: {},
	porDia: {},
	sempre: null,
	entradasHora: {}
};

describe('a consola desenha-se', () => {
	for (const vista of ['utilizadores', 'sistema'] as const) {
		it(`a vista ${vista} sai como HTML inteiro`, () => {
			const html = pagina({ ...minimo, vista, chave: 'abc' });
			expect(html.startsWith('<!doctype html>')).toBe(true);
			expect(html.trimEnd().endsWith('</html>')).toBe(true);
			// se um backtick fechar o template a meio, o fim da página desaparece
			expect(html).toContain('</body>');
			expect(html).toContain('Consola OK4Sticks');
		});
	}

	it('a vista escolhida é a que desenha, e a outra não', () => {
		expect(pagina({ ...minimo, vista: 'sistema' })).toContain('pedidos à APL por hora');
		expect(pagina({ ...minimo, vista: 'utilizadores' })).not.toContain('pedidos à APL por hora');
		expect(pagina({ ...minimo, vista: 'utilizadores' })).toContain('entradas por hora');
	});

	/** Foi este o defeito que o dono apanhou: os links de um gráfico não levavam a vista. */
	it('todos os links internos levam a vista e a chave consigo', () => {
		const html = pagina({ ...minimo, vista: 'sistema', chave: 'abc' });
		const hrefs = [...html.matchAll(/href="(\?[^"]*)"/g)].map((m) => m[1]);
		expect(hrefs.length).toBeGreaterThan(5);

		// a chave viaja em todos, sem excepção
		for (const h of hrefs) expect(h).toContain('chave=abc');

		// e a vista também, excepto no único link cuja função é trocá-la
		const semVista = hrefs.filter((h) => !h.includes('vista=sistema'));
		expect(semVista).toHaveLength(1);
	});

	it('sem dados nenhuns não rebenta, e di-lo em vez de desenhar zeros', () => {
		const html = pagina({ ...minimo, vista: 'utilizadores' });
		expect(html).toContain('Não há horas registadas neste dia');
	});
});

describe('o número por cima de cada barra', () => {
	/**
	 * Pedido pelo dono a 10/10/2026, e para **todos** os gráficos: *"por cima de cada barra
	 * que tenhas valores, o número total de eventos/chamadas"*. Lia os totais pelo tamanho
	 * relativo das barras e pela legenda, que dá o total do dia e não o da hora.
	 */
	const comHoras = {
		...minimo,
		horas: { 11: { calendario: 37, clasificacion: 38, ficha: 301, competiciones: 3 } },
		entradasHora: { [hoje]: { 15: { novos: 2, volta: 7 } } },
		porDia: { [hoje]: { calendario: 185, ficha: 2954 } }
	};

	it('os pedidos por hora escrevem o total da hora', () => {
		const html = pagina({ ...comHoras, vista: 'sistema' });
		expect(html).toContain('>379</b>');          // 37 + 38 + 301 + 3
	});

	it('as entradas por hora também', () => {
		const html = pagina({ ...comHoras, vista: 'utilizadores' });
		expect(html).toContain('>9</b>');            // 2 novos + 7 de volta
	});

	it('e os pedidos por dia, que o tinham por baixo da barra', () => {
		const html = pagina({ ...comHoras, vista: 'sistema' });
		expect(html).toContain('>3139</b>');         // 185 + 2954
	});

	it('uma hora sem nada não leva um zero escrito', () => {
		/** Vinte e quatro zeros nas horas da madrugada competem com os números que interessam. */
		const html = pagina({ ...comHoras, vista: 'sistema' });
		expect(html).not.toContain('class="v" style="bottom:min(calc(0%');
		expect(html).not.toMatch(/>0<\/b>/);
	});

	it('o número nunca sobe acima do cimo do gráfico', () => {
		/**
		 * Posicionado em absoluto, uma barra que chegue ao tecto punha o número por cima do
		 * título do cartão. O `min()` é a rede, e é a razão de ele existir.
		 */
		const html = pagina({ ...comHoras, vista: 'sistema' });
		for (const m of html.matchAll(/class="v" style="bottom:([^"]+)"/g))
			expect(m[1], m[0]).toContain('100% - 1em');
	});
});

/**
 * O pulso: a consola tem de saber dizer que **não** sabe.
 *
 * A 09/10/2026 os `cron` do observador deixaram de disparar e esta página mostrou "tudo em
 * ordem" a noite toda, com a última leitura de catorze horas antes. O farol estava verde
 * porque o último estado conhecido era verde, e ninguém perguntava de quando era.
 */
describe('o pulso do observador', () => {
	const comPulso = (minutosAtras: number | null) => {
		const d = new Date(Date.now() - (minutosAtras ?? 0) * 60000);
		const lisboa = d.toLocaleString('sv-SE', { timeZone: 'Europe/Lisbon' });
		return pagina({
			...minimo,
			actualizado: minutosAtras === null ? null : lisboa,
			estado: { saude: { estado: 'verde', jogos_hoje: 2, a_decorrer: 0 } }
		});
	};

	it('uma leitura recente mostra o estado e a idade dela', () => {
		const html = comPulso(2);
		expect(html).toContain('tudo em ordem');
		expect(html).toContain('lido há 2 min');
	});

	/**
	 * Estes dois só valem **dentro das horas de leitura**. De madrugada o observador está
	 * calado por desenho, e um alarme que toca todas as noites é um alarme que se aprende a
	 * ignorar — por isso o teste salta-se quando corre fora de horas, em vez de afirmar o
	 * contrário do que o código faz.
	 */
	const emHorasDeLeitura =
		Number(new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Lisbon' }).slice(11, 13)) >= 7;

	it.runIf(emHorasDeLeitura)('uma leitura velha deixa de ser "tudo em ordem"', () => {
		const html = comPulso(840); // as catorze horas da noite de 09/10
		expect(html).not.toContain('tudo em ordem');
		expect(html).toContain('o observador está calado');
		expect(html).toContain('última leitura há 840 min');
	});

	it.runIf(emHorasDeLeitura)('nunca ter lido também é estar calado, e não estar bem', () => {
		const html = comPulso(null);
		expect(html).not.toContain('tudo em ordem');
		expect(html).toContain('nunca leu');
	});

	it.runIf(!emHorasDeLeitura)('de madrugada o silêncio não é alarme', () => {
		const html = comPulso(840);
		expect(html).toContain('fora das horas de leitura');
		expect(html).not.toContain('o observador está calado');
	});
});
