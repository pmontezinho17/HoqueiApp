import { describe, expect, it } from 'vitest';
import {
	TITULO_MAXIMO,
	corpo,
	linhasDoWrangler,
	titulo
} from '../../../scripts/sugestao_para_registo.mjs';

/**
 * A geração do registo que o `sugestoes.yml` cria por cada sugestão.
 *
 * Isto esteve dentro do YAML, em três `node -e`, e o que eu escrevi no backlog a 13/10/2026 foi
 * que o tinha "testado à mão, com aspas, acentos e mudanças de linha". Testar à mão uma coisa que
 * corre todos os dias às 07:20 é deixar a verificação de fora do que se publica: na vez em que
 * partir, parte sozinha, de madrugada, e sobre o texto de outra pessoa.
 */
describe('o título de um registo', () => {
	it('é a primeira linha útil, em espaços simples', () => {
		expect(titulo({ texto: 'No jogo dos sub-15 os nomes\naparecem cortados', id: 7 })).toBe(
			'No jogo dos sub-15 os nomes aparecem cortados'
		);
	});

	it('corta aos 60 caracteres, com reticências a contar', () => {
		const t = titulo({ texto: 'a'.repeat(200), id: 7 });
		expect(t).toHaveLength(TITULO_MAXIMO);
		expect(t.endsWith('…')).toBe(true);
	});

	it('deixa em paz um texto que caiba exactamente', () => {
		const exacto = 'a'.repeat(TITULO_MAXIMO);
		expect(titulo({ texto: exacto, id: 7 })).toBe(exacto);
	});

	it('nunca sai vazio, porque o GitHub recusa uma issue sem título', () => {
		// Uma sugestão perdida por causa de um título vazio era o pior desfecho possível: o
		// texto dela fica na D1 com `issue IS NULL` e tenta outra vez todos os dias, para
		// sempre, sempre a falhar.
		expect(titulo({ texto: '   \n  ', id: 12 })).toBe('Sugestão sem texto (12)');
		expect(titulo({ texto: null, id: 12 })).toBe('Sugestão sem texto (12)');
		expect(titulo({ id: 12 })).toBe('Sugestão sem texto (12)');
	});

	it('não inventa um resumo — as palavras são as da pessoa', () => {
		const dela = 'Isto está péssimo e não percebo nada';
		expect(titulo({ texto: dela, id: 1 })).toBe(dela);
	});
});

describe('o corpo de um registo', () => {
	const s = {
		id: 3,
		dia: '2026-10-13',
		hora: '22:49:30',
		texto: 'Linha um.\n\nLinha dois, com "aspas" e acentuação à portuguesa.',
		ecra: '/jogo/9539?aba=equipas',
		versao: '1.2'
	};

	it('começa com o texto da pessoa, inteiro e sem mexer', () => {
		// É a única parte do registo que não é nossa. Nada de reflow nem de escapes.
		expect(corpo(s).startsWith(s.texto)).toBe(true);
	});

	it('separa o que é nosso com uma linha, e põe-no numa tabela', () => {
		const c = corpo(s);
		expect(c).toContain('\n---\n');
		expect(c).toContain('| quando | 2026-10-13 às 22:49:30 |');
		expect(c).toContain('| ecrã | `/jogo/9539?aba=equipas` |');
		expect(c).toContain('| versão | 1.2 |');
		expect(c).toContain('| id na D1 | 3 |');
	});

	it('diz porque é que o repositório é privado', () => {
		// Está no corpo de propósito: quem abrir o arquivo daqui a seis meses tem de perceber
		// que aquelas são palavras de outra pessoa antes de lhes pegar.
		expect(corpo(s)).toContain('é por isso que este repositório é privado');
	});

	it('aguenta os campos que podem vir vazios', () => {
		const c = corpo({ id: 9, dia: '2026-10-13', hora: '08:00:00', texto: 'x' });
		expect(c).toContain('| ecrã | `—` |');
		expect(c).toContain('| versão | — |');
	});
});

describe('ler a resposta do wrangler', () => {
	it('tira as linhas de uma resposta boa', () => {
		const r = linhasDoWrangler([{ results: [{ id: 1 }, { id: 2 }], success: true }]);
		expect(r).toEqual({ linhas: [{ id: 1 }, { id: 2 }] });
	});

	it('aceita a resposta sem o embrulho em lista', () => {
		expect(linhasDoWrangler({ results: [] })).toEqual({ linhas: [] });
	});

	it('uma tabela que não existe é **erro**, e não zero sugestões', () => {
		// Esta é a resposta verdadeira, copiada de uma leitura à base de produção a
		// 13/10/2026, antes de a tabela `sugestao` lá existir. O passo antigo via um ficheiro
		// não-vazio, seguia, e o `?? []` dava zero: a corrida dizia "0 sugestões por arquivar",
		// verde, a afirmar que não havia nada quando o que houve foi uma falha.
		const real = {
			error: {
				text: 'A request to the Cloudflare API (/accounts/…/d1/database/…/query) failed.',
				notes: [{ text: 'no such table: sugestao: SQLITE_ERROR [code: 7500]' }],
				kind: 'error',
				name: 'APIError',
				code: 7500
			}
		};
		const r = linhasDoWrangler(real);
		expect(r).not.toHaveProperty('linhas');
		expect('erro' in r && r.erro).toContain('no such table: sugestao');
	});

	it('uma resposta de forma estranha também é erro', () => {
		// Se o wrangler mudar de formato, o modo de falha a preferir é dizê-lo. Dar zero era
		// deixar as sugestões a acumular em silêncio até alguém reparar.
		for (const esquisita of [null, undefined, {}, { results: 'nada disto' }, 'texto']) {
			expect(linhasDoWrangler(esquisita)).toHaveProperty('erro');
		}
	});
});
