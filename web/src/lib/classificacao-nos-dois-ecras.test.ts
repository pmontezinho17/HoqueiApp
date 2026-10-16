import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * **Cada forma de classificação tem de aparecer nos dois ecrãs que a mostram.**
 *
 * ## O defeito que isto guarda
 *
 * Há três formas de classificar uma prova neste projecto: a tabela que a fonte publica, a que
 * nós calculamos quando ela não publica nenhuma, e o **Mérito da Formação** — que é o que o
 * Artigo 92.º manda usar nos Escolares e nos Benjamins. Duas delas são tabelas de pontos; a
 * terceira não é, e tem componentes próprios.
 *
 * A 10/10/2026 o Mérito entrou e, com ele, deixámos de calcular a tabela de pontos desses dois
 * escalões — correctamente: é o Mérito que manda, e duas classificações para a mesma prova
 * seriam duas verdades. O ecrã da **competição** passou a mostrar o Mérito. O ecrã da **equipa**
 * não, porque construía o separador só a partir da tabela de pontos.
 *
 * Resultado, medido nos dados publicados: entre 07/10 e 10/10 a série A dos Benjamins tinha 8
 * linhas de classificação calculada; a partir de 10/10 às 19:14, zero. Durante quatro dias, quem
 * abrisse o HC Sintra / Benjamins leu *"Esta equipa não tem classificação publicada"*. Foi o dono
 * que o encontrou, no telemóvel, a 14/10.
 *
 * **E eu olhei para isto a 13/10 e dei-o por bom**, porque fui ver os dados em vez do ecrã: as
 * tabelas calculadas estarem vazias era mesmo o comportamento desenhado, e concluí daí que não
 * havia avaria. A pergunta certa não era *"os dados estão como mandámos?"*, era *"o que aparece
 * a quem abre a app?"*.
 *
 * ## O que este teste é, e o que não é
 *
 * É texto dos ficheiros, como os outros testes de `.svelte` deste projecto — não há montagem de
 * componentes aqui. Não prova que o Mérito **se vê**; isso confirmou-se no browser, a 375×812,
 * nos dois temas, com HC Sintra em 3.º nos Benjamins e em 2.º nos Escolares.
 *
 * O que ele garante é a **ligação**: que o ecrã da equipa continua a saber da forma de
 * classificação que não é uma tabela de pontos. Um refactor que a deixe cair outra vez falha
 * aqui em vez de falhar no telemóvel de alguém, quatro dias depois.
 */
describe('as três formas de classificar aparecem onde têm de aparecer', () => {
	const equipa = readFileSync(
		new URL('../routes/equipa/[cat]/[nome]/+page.svelte', import.meta.url),
		'utf-8'
	);
	const equipaDados = readFileSync(
		new URL('../routes/equipa/[cat]/[nome]/+page.ts', import.meta.url),
		'utf-8'
	);
	const competicao = readFileSync(
		new URL('../routes/competicoes/[grupo]/+page.svelte', import.meta.url),
		'utf-8'
	);
	const competicaoDados = readFileSync(
		new URL('../routes/competicoes/[grupo]/+page.ts', import.meta.url),
		'utf-8'
	);

	it('os dois ecrãs carregam o Mérito', () => {
		// Sem isto no `+page.ts`, o ecrã não tem sequer os dados para decidir o que mostrar —
		// foi exactamente o que faltava no da equipa.
		for (const [onde, fonte] of [
			['equipa', equipaDados],
			['competição', competicaoDados]
		] as const) {
			expect(fonte, onde).toMatch(/carregarMerito\(/);
		}
	});

	it('os dois ecrãs desenham a tabela do Mérito', () => {
		for (const [onde, fonte] of [
			['equipa', equipa],
			['competição', competicao]
		] as const) {
			expect(fonte, onde).toMatch(/import TabelaMerito from/);
			expect(fonte, onde).toMatch(/<TabelaMerito/);
		}
	});

	it('os dois ecrãs explicam o Mérito a quem nunca o viu', () => {
		// O `ChapeuMerito` é a parte que não se pode esconder: sem ele, uma coluna "Pen" com
		// números negativos parece um castigo inventado por nós.
		for (const [onde, fonte] of [
			['equipa', equipa],
			['competição', competicao]
		] as const) {
			expect(fonte, onde).toMatch(/<ChapeuMerito/);
			expect(fonte, onde).toMatch(/<LegendaMerito/);
		}
	});

	it('os dois ecrãs continuam a desenhar a tabela de pontos', () => {
		// A outra metade: corrigir o Mérito não pode custar o que já lá estava.
		expect(equipa).toMatch(/<TabelaClassificacao/);
		expect(competicao).toMatch(/<TabelaClassificacao/);
	});

	it('o ecrã da equipa só diz "não tem classificação" quando não tem mesmo nenhuma', () => {
		// A mensagem tem de estar **depois** do ramo do Mérito, senão volta a ganhar-lhe. E a
		// decisão tem de vir da função pura — é lá que está testada contra os dados de todas as
		// equipas, no `equipa-sem-classificacao.test.ts`.
		const vazio = equipa.indexOf('não tem classificação publicada');
		const comMerito = equipa.indexOf("aba === 'classificacao' && oQueMostrar === 'merito'");
		expect(comMerito).toBeGreaterThan(-1);
		expect(vazio).toBeGreaterThan(comMerito);
		expect(equipa).toMatch(/classificacaoDaEquipa\(provas, data\.equipa\)/);
	});
});
