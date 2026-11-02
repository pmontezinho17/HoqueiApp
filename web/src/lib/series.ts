/**
 * Que séries é que o ecrã de uma competição mostra, e que escolhas oferece.
 *
 * ## Porque é que isto existe
 *
 * Até 31/10/2026 a escolha era *"Todas as séries"* ou *"Só a série"* da equipa favorita — e
 * só aparecia a quem tivesse uma favorita lá dentro. Quem não tinha, ou queria ver outra série,
 * percorria todas empilhadas: nos Sub-17 são seis, de A a F. Uma pessoa escreveu-o na caixa de
 * sugestões a 29/10/2026, e o dono disse que era algo que queria melhorar há muito.
 *
 * **Vive aqui e não no `.svelte`** pela regra do `AGENTS.md`: nenhum teste do `web/` monta um
 * componente, e uma decisão dentro de um `{#if}` é invisível para a suite inteira.
 */

/** O mínimo de uma prova que a escolha precisa de saber. */
export type ProvaComSerie = {
	competicao: { id: number; serie?: string | null };
	dados: { equipas: { nome: string }[] };
};

export type OpcaoDeSerie = {
	/** `''` = todas */
	valor: string;
	rotulo: string;
	/** a série onde joga uma equipa que a pessoa segue */
	minha: boolean;
};

/** A letra de uma série, ou `null` numa prova sem séries. */
const letra = (p: ProvaComSerie) => p.competicao.serie?.trim() || null;

/**
 * As escolhas, pela ordem em que a APL as numera: *Todas* primeiro e depois cada série.
 *
 * **Vazio quando não há escolha a fazer** — uma prova de série única, ou provas sem letra —,
 * e o ecrã não desenha a lista. Uma lista que não muda nada é ruído.
 *
 * Uma lista nativa e não uma fila de botões desde 31/10/2026: a fila de letras ocupava uma
 * linha inteira por cima das tabelas, e o dono pediu-a ao lado da escolha das colunas, como os
 * filtros da lista de jogos.
 *
 * A série da favorita fica marcada e não escolhida: abrir a competição continua a mostrar
 * todas, como até aqui, e a marca diz onde está a equipa sem decidir por quem lê.
 */
export function opcoesDeSerie(provas: ProvaComSerie[], minhas: Set<string>): OpcaoDeSerie[] {
	const comLetra = provas.filter((p) => letra(p));
	if (provas.length < 2 || comLetra.length !== provas.length) return [];
	const series = comLetra
		.map((p) => {
			const minha = p.dados.equipas.some((e) => minhas.has(e.nome));
			// a estrela é a mesma da escolha de clubes; numa lista nativa só cabe em texto
			return { valor: letra(p)!, rotulo: `Série ${letra(p)}${minha ? ' ★' : ''}`, minha };
		})
		.sort((a, b) => a.valor.localeCompare(b.valor, 'pt'));
	return [{ valor: '', rotulo: 'Todas as séries', minha: false }, ...series];
}

/**
 * As provas a desenhar para uma escolha.
 *
 * Uma escolha que já não existe — um endereço partilhado de uma série que a APL juntou a
 * outra, ou um `?serie=` escrito à mão — mostra todas, e nunca um ecrã vazio.
 */
export function seriesVisiveis<T extends ProvaComSerie>(provas: T[], escolha: string): T[] {
	if (!escolha) return provas;
	const so = provas.filter((p) => letra(p) === escolha);
	return so.length ? so : provas;
}
