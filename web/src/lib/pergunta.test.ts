import { describe, expect, it } from 'vitest';
import { linkDeEmail } from './pergunta';
import { CONTACTO } from './contacto';

/** Lê de volta o que o programa de email vai receber, em vez de comparar a cadeia codificada. */
function abrir(link: string) {
	const u = new URL(link);
	return {
		para: u.pathname,
		assunto: u.searchParams.get('subject'),
		corpo: u.searchParams.get('body')
	};
}

describe('o email de uma pergunta', () => {
	it('vai para o endereço de suporte, e só para esse', () => {
		expect(abrir(linkDeEmail('pergunta', 'olá', 'ecrã: /')).para).toBe(CONTACTO);
	});

	it('o assunto diz se é pergunta ou sugestão, para se filtrar no Gmail', () => {
		expect(abrir(linkDeEmail('pergunta', 'x', '')).assunto).toMatch(/— pergunta$/);
		expect(abrir(linkDeEmail('sugestao', 'x', '')).assunto).toMatch(/— sugestão$/);
	});

	it('leva o texto e o contexto que a pessoa vê na caixa', () => {
		const { corpo } = abrir(linkDeEmail('pergunta', '  Porque é que o jogo diz 2-1?  ', 'ecrã: /jogo/9'));
		expect(corpo).toBe('Porque é que o jogo diz 2-1?\n\n—\necrã: /jogo/9');
	});

	it('um & ou um ? no texto não cortam o email a meio', () => {
		// Sem codificar, o `&` abria um parâmetro novo e o resto da pergunta perdia-se.
		const { corpo } = abrir(linkDeEmail('pergunta', 'Sub-15 & sub-17? Onde?', ''));
		expect(corpo?.startsWith('Sub-15 & sub-17? Onde?')).toBe(true);
	});

	it('sem texto ainda abre, com o contexto, para quem prefere escrever no email', () => {
		expect(abrir(linkDeEmail('pergunta', '', 'ecrã: /')).corpo).toBe('\n\n—\necrã: /');
	});
});
