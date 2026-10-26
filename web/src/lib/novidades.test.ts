import { describe, expect, it } from 'vitest';
import { aReabrir, oHistorico, agrupar, partesDoTexto, porMostrar } from './novidades.svelte';
import { GRUPOS, NOVIDADES, VERSAO, versaoDaConstrucao, type Novidade, type Ponto } from './versao';

const ponto = (titulo: string, tipo: Ponto['tipo'] = 'novo'): Ponto => ({
	tipo,
	titulo,
	texto: 'o porquê'
});

const lista: Novidade[] = [
	{ versao: '1.3', data: '2026-11-01', pontos: [ponto('c')] },
	{ versao: '1.2', data: '2026-10-20', pontos: [ponto('b')] },
	{ versao: '1.1', data: '2026-10-15', pontos: [ponto('a')] }
];

describe('quando é que a caixa do "o que mudou" aparece', () => {
	/**
	 * Uma lista de alterações a quem nunca usou a app é uma interrupção sem conteúdo, e é a
	 * forma mais rápida de ensinar alguém a fechar caixas sem ler.
	 */
	it('a primeira visita não vê nada', () => {
		expect(porMostrar(null, '1.3', lista)).toEqual([]);
	});

	it('quem já viu esta versão não a vê outra vez', () => {
		expect(porMostrar('1.3', '1.3', lista)).toEqual([]);
	});

	it('quem vinha da anterior vê só o que entrou depois', () => {
		expect(porMostrar('1.2', '1.3', lista).map((n) => n.versao)).toEqual(['1.3']);
	});

	it('quem salta várias versões vê todas as que perdeu', () => {
		expect(porMostrar('1.1', '1.3', lista).map((n) => n.versao)).toEqual(['1.3', '1.2']);
	});

	/** Uma versão guardada que já não existe na lista — depois de uma limpeza, por exemplo. */
	it('uma versão desconhecida mostra a lista inteira, em vez de nada', () => {
		expect(porMostrar('0.9', '1.3', lista)).toHaveLength(3);
	});

	/**
	 * Uma publicação que sobe a versão sem mexer no que o utilizador vê não tem nada para
	 * dizer — e não deve interromper ninguém para o dizer.
	 */
	it('uma versão sem entrada na lista não interrompe ninguém', () => {
		expect(porMostrar('1.3', '1.4', lista)).toEqual([]);
	});
});

describe('quando alguém pede para ver as novidades outra vez', () => {
	/**
	 * Pedido pelo dono a 12/10/2026, depois de fechar a caixa sem querer. É outra pergunta que
	 * a do `porMostrar`, e por isso tem outra resposta: ali a resposta certa é quase sempre
	 * "nada", aqui **nunca** pode ser nada — um botão que não faz nada é pior do que não haver
	 * botão nenhum.
	 */
	it('mostra o que entrou nesta versão', () => {
		expect(aReabrir('1.2', lista).map((n) => n.versao)).toEqual(['1.2']);
	});

	it('a marca do aparelho não entra nesta conta — ele pediu para ver', () => {
		/** O contraste com o `porMostrar`, que a esta mesma versão responderia `[]`. */
		expect(porMostrar('1.3', '1.3', lista)).toEqual([]);
		expect(aReabrir('1.3', lista)).toHaveLength(1);
	});

	it('uma versão sem notas cai na última coisa que mudou, em vez de não abrir nada', () => {
		/**
		 * É o caso de uma publicação que só mexeu no raspador ou num workflow: sobe o número
		 * e não escreve novidades, de propósito. A linha do menu tem de continuar a dizer
		 * alguma coisa.
		 */
		expect(aReabrir('1.4', lista).map((n) => n.versao)).toEqual(['1.3']);
	});

	it('sem lista nenhuma devolve nada — e aí o menu esconde a linha', () => {
		expect(aReabrir('1.0', [])).toEqual([]);
	});
});

describe('os grupos da caixa', () => {
	/**
	 * A avaliação que levou a três grupos — e não a "layout", nem a uma divisão por zona da
	 * app — está no cabeçalho do `Tipo`, em `versao.ts`. Aqui verifica-se o que o código faz
	 * com eles.
	 */
	it('respeita a ordem declarada, e não a ordem em que os pontos vêm escritos', () => {
		const grupos = agrupar([
			ponto('x', 'corrigido'),
			ponto('y', 'novo'),
			ponto('z', 'regras')
		]);
		expect(grupos.map((g) => g.rotulo)).toEqual(GRUPOS.map((g) => g.rotulo));
	});

	it('um grupo sem pontos não aparece', () => {
		/**
		 * Um cabeçalho vazio é pior do que não haver cabeçalhos: faz a pessoa procurar o que
		 * não existe. Uma versão que só traga correcções mostra "Corrigido" e mais nada.
		 */
		const grupos = agrupar([ponto('x', 'corrigido')]);
		expect(grupos).toHaveLength(1);
		expect(grupos[0].rotulo).toBe('Corrigido');
	});

	it('não perde nem duplica pontos', () => {
		const pontos = [ponto('a', 'novo'), ponto('b', 'regras'), ponto('c', 'novo')];
		const saida = agrupar(pontos).flatMap((g) => g.pontos);
		expect(saida).toHaveLength(pontos.length);
		expect(new Set(saida.map((p) => p.titulo))).toEqual(new Set(['a', 'b', 'c']));
	});

	it('sem pontos nenhuns não há grupos', () => {
		expect(agrupar([])).toEqual([]);
	});
});

describe('os pontos que vamos publicar', () => {
	const todos = NOVIDADES.flatMap((n) => n.pontos);

	it('há pontos para verificar, senão isto não diz nada', () => {
		expect(todos.length).toBeGreaterThan(0);
	});

	it('cada um tem chavão e descrição, e os dois dizem algo', () => {
		for (const p of todos) {
			expect(p.titulo.trim(), JSON.stringify(p)).not.toBe('');
			expect(p.texto.trim(), p.titulo).not.toBe('');
		}
	});

	it('o chavão é curto', () => {
		/**
		 * **Isto é a regra que impede o pedido do dono de se desfazer com o tempo.** Ele pediu
		 * um chavão em negrito seguido de uma pequena descrição; um título que dá três linhas
		 * deixa de ser um chavão e volta a ser a frase corrida que isto veio substituir. 64
		 * caracteres são cerca de duas linhas a 375px, que é o limite do que ainda se lê de
		 * relance.
		 */
		for (const p of todos) expect(p.titulo.length, p.titulo).toBeLessThanOrEqual(64);
	});

	it('o chavão não acaba em ponto — é um título e não uma frase', () => {
		for (const p of todos) expect(p.titulo.endsWith('.'), p.titulo).toBe(false);
	});

	it('cada um cai num grupo conhecido', () => {
		const tipos = new Set(GRUPOS.map((g) => g.tipo));
		for (const p of todos) expect(tipos.has(p.tipo), p.titulo).toBe(true);
	});

	it('todos aparecem na caixa — nenhum fica órfão por causa do agrupamento', () => {
		expect(agrupar(todos).flatMap((g) => g.pontos)).toHaveLength(todos.length);
	});
});

/**
 * O histórico do menu mostra **tudo**, e a folha automática mostra só o que é novo para este
 * aparelho. São duas perguntas diferentes — *"o que mudou para mim?"* e *"o que já mudou nesta
 * app?"* — e durante uns dias tiveram a mesma resposta.
 *
 * Pedido do dono a 17/10/2026: *"colocar todas as alterações que foram feitas, mas mais
 * resumidas, caso contrário fica um texto gigantesco"*.
 */
describe('o histórico do menu', () => {
	it('mostra todas as versões, e não só a actual', () => {
		expect(oHistorico().length).toBe(NOVIDADES.length);
		expect(oHistorico().length).toBeGreaterThan(1);
	});

	it('pela ordem da lista, da mais recente para a mais antiga', () => {
		// A ordem é a do `NOVIDADES` e não se reordena aqui: o ficheiro é a fonte, e uma
		// segunda ordenação seria uma segunda verdade sobre o que veio primeiro.
		const versoes = oHistorico().map((n) => n.versao);
		expect(versoes).toEqual(NOVIDADES.map((n) => n.versao));
	});

	it('e é mais do que a folha automática mostra a quem acabou de actualizar', () => {
		// Quem vinha da versão anterior vê um lote; quem abre o menu vê-os todos.
		const anterior = NOVIDADES[1].versao;
		expect(porMostrar(anterior).length).toBeLessThan(oHistorico().length);
	});
});

/**
 * A versão da construção. Pedido do dono a 26/10/2026, depois de ver produção saltar da `1.6`
 * para a `1.8` — o porquê está em `versaoDaConstrucao`.
 */
describe('a versão da construção', () => {
	it('em produção é só o número, para duas construções iguais continuarem iguais', () => {
		expect(versaoDaConstrucao('1.9')).toBe('1.9');
		expect(versaoDaConstrucao('1.9', '')).toBe('1.9');
		expect(versaoDaConstrucao('1.9', null)).toBe('1.9');
	});

	it('no site de testes leva os sete primeiros caracteres do commit', () => {
		expect(versaoDaConstrucao('1.9', '40a5273f9c1e2d3b4a5f6e7d8c9b0a1f2e3d4c5b')).toBe('1.9+40a5273');
	});

	it('duas fusões no dev dão duas versões diferentes, e é isso que faz aparecer o aviso', () => {
		expect(versaoDaConstrucao('1.9', 'aaaaaaa1')).not.toBe(versaoDaConstrucao('1.9', 'bbbbbbb2'));
	});

	it('o número das novidades é o da próxima entrega, e não leva a marca', () => {
		// As `NOVIDADES` agrupam-se pelo número que produção vai ver; se a marca entrasse aqui,
		// cada fusão no `dev` abria uma entrada nova e o buraco voltava.
		expect(NOVIDADES[0].versao).toBe(VERSAO);
		expect(VERSAO).not.toContain('+');
	});
});

describe('o negrito no texto de uma novidade', () => {
	it('o que está entre ** vai a negrito, e o resto não', () => {
		expect(partesDoTexto('escolhes **Sugestão** ou **Pergunta**.')).toEqual([
			{ texto: 'escolhes ', negrito: false },
			{ texto: 'Sugestão', negrito: true },
			{ texto: ' ou ', negrito: false },
			{ texto: 'Pergunta', negrito: true },
			{ texto: '.', negrito: false }
		]);
	});

	it('um texto sem marcas sai inteiro, como antes', () => {
		expect(partesDoTexto('sem nada')).toEqual([{ texto: 'sem nada', negrito: false }]);
	});

	it('nenhuma novidade deixa um ** por fechar, que punha o resto do texto a negrito', () => {
		for (const n of NOVIDADES)
			for (const p of n.pontos)
				expect(p.texto.split('**').length % 2, `${n.versao}: ${p.titulo}`).toBe(1);
	});
});
