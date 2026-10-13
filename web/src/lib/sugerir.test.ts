import { describe, expect, it } from 'vitest';
import { MAXIMO, TECTO_DIARIO, decidir } from '../../functions/sugerir.js';

/**
 * A decisão de aceitar ou recusar uma sugestão.
 *
 * **O que isto protege não é a base de dados, é a promessa.** Esta é a primeira tabela do
 * projecto com texto de outras pessoas, e a única defesa que temos contra abuso é um tecto
 * diário e um limite de tamanho — porque limitar por pessoa exigia guardar um identificador,
 * mesmo que por *hash*, e isso é exactamente o que a política de privacidade diz que não
 * fazemos. Sendo a defesa fraca de propósito, tem de estar certa.
 */
describe('o que se aceita guardar', () => {
	const ok = { texto: 'os nomes aparecem cortados nos sub-15', ecra: '/jogo/9539', versao: '1.1' };

	it('uma sugestão normal entra', () => {
		const d = decidir(ok, 0);
		expect(d.aceitar).toBe(true);
		expect(d.texto).toBe(ok.texto);
		expect(d.ecra).toBe('/jogo/9539');
		expect(d.versao).toBe('1.1');
	});

	it('o texto vem sem espaços nas pontas', () => {
		expect(decidir({ texto: '   com espaços   ' }, 0).texto).toBe('com espaços');
	});

	it('sem ecrã nem versão entra à mesma — é contexto, não requisito', () => {
		const d = decidir({ texto: 'qualquer coisa' }, 0);
		expect(d.aceitar).toBe(true);
		expect(d.ecra).toBe(null);
		expect(d.versao).toBe(null);
	});
});

describe('o que se recusa', () => {
	it('uma caixa vazia, ou só com espaços', () => {
		for (const t of ['', '   ', '\n\t', '\u00a0'])
			expect(decidir({ texto: t }, 0).aceitar, JSON.stringify(t)).toBe(false);
	});

	it('texto acima do limite', () => {
		expect(decidir({ texto: 'a'.repeat(MAXIMO) }, 0).aceitar).toBe(true);
		expect(decidir({ texto: 'a'.repeat(MAXIMO + 1) }, 0).aceitar).toBe(false);
	});

	it('o tecto diário, e no limite exacto', () => {
		expect(decidir({ texto: 'x' }, TECTO_DIARIO - 1).aceitar).toBe(true);
		expect(decidir({ texto: 'x' }, TECTO_DIARIO).aceitar).toBe(false);
	});

	it('a armadilha preenchida', () => {
		/**
		 * O campo `ok4` vai sempre vazio da caixa. Um robô que preencha tudo o que encontra
		 * tropeça aqui, e não custa um pedido nem um identificador a ninguém. Não é segurança
		 * — é tirar do caminho o que de certeza não é uma pessoa, como o filtro de agentes do
		 * contador.
		 */
		expect(decidir({ texto: 'x', ok4: 'sou um robô' }, 0).aceitar).toBe(false);
		// e vazio não é tropeçar
		expect(decidir({ texto: 'x', ok4: '' }, 0).aceitar).toBe(true);
	});

	it('um corpo que não é um objecto', () => {
		for (const c of [null, undefined, 'texto', 42, []])
			expect(decidir(c, 0).aceitar, JSON.stringify(c) ?? 'undefined').toBe(false);
	});

	it('campos do tipo errado não estouram nem entram pela porta do lado', () => {
		expect(decidir({ texto: 42 }, 0).aceitar).toBe(false);
		// um ecrã que não é texto é descartado, mas não faz a sugestão cair
		const d = decidir({ texto: 'x', ecra: { a: 1 }, versao: [] }, 0);
		expect(d.aceitar).toBe(true);
		expect(d.ecra).toBe(null);
		expect(d.versao).toBe(null);
	});
});

describe('o que se corta em vez de recusar', () => {
	/**
	 * O ecrã e a versão são contexto nosso, não do utilizador: se vierem absurdos, cortam-se e
	 * a sugestão entra. Recusar uma sugestão por causa de um campo que **nós** preenchemos era
	 * perder o que a pessoa escreveu por um erro que não é dela.
	 */
	it('um ecrã enorme é cortado', () => {
		const d = decidir({ texto: 'x', ecra: '/' + 'a'.repeat(500) }, 0);
		expect(d.aceitar).toBe(true);
		expect(d.ecra?.length).toBe(200);
	});

	it('uma versão enorme é cortada', () => {
		const d = decidir({ texto: 'x', versao: '9'.repeat(100) }, 0);
		expect(d.versao?.length).toBe(20);
	});
});

describe('os limites são números defensáveis', () => {
	it('o tamanho dá para escrever uma crítica a sério', () => {
		// 2000 caracteres são ~350 palavras: mais do que ninguém escreve num telemóvel
		expect(MAXIMO).toBeGreaterThanOrEqual(1000);
	});

	it('o tecto diário é muito acima do uso real e muito abaixo de um ataque', () => {
		// medido a 13/10/2026: ~14 aparelhos distintos por dia
		expect(TECTO_DIARIO).toBeGreaterThan(50);
		expect(TECTO_DIARIO).toBeLessThanOrEqual(1000);
	});
});
