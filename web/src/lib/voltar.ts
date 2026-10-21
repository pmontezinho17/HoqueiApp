/**
 * A seta de voltar da ficha de jogo: recuar na história, ou seguir um endereço.
 *
 * ## O defeito que isto fecha
 *
 * Reportado pela caixa "O que está mal" a 18/10/2026, no ecrã `/jogo/9517`:
 *
 * > Estou dentro do menu da equipa. Escolho um jogo para ver os detalhes. Se carrego para voltar
 * > para trás, volta ao menu principal, não ao menu onde se estava.
 *
 * A seta era um `<a href="/?dia=…">` fixo. A escolha fazia sentido quando foi feita — e o
 * comentário que lá estava explicava-a bem: *"leva ao dia deste jogo e não a hoje: quem abriu um
 * jogo de quinta-feira quer voltar a quinta-feira"*. O que ninguém tinha previsto é que a ficha
 * de jogo deixasse de se abrir só a partir da lista do dia: abre-se da página da equipa, do
 * calendário da competição, da pesquisa e de O Meu Clube.
 *
 * **E a 20/10/2026 isto piorou por minha causa.** Nesse dia todas as linhas da lista passaram a
 * abrir a ficha, incluindo as dos jogos por disputar — ou seja, a porta por onde se sai da ficha
 * passou a ser usada muito mais vezes do que era. Corrigir o destino dela deixou de ser um
 * acabamento.
 *
 * ## A regra
 *
 * * **Viemos de dentro da app** → recua-se na história, e a pessoa volta exactamente ao ecrã
 *   onde estava, com a posição de leitura e os separadores como os deixou.
 * * **Chegámos de fora** — um link partilhado, um favorito, a app instalada a abrir de raiz —
 *   → não há história para onde recuar, e segue-se o endereço: o dia deste jogo.
 *
 * O `href` fica sempre lá, e é isso que mantém o botão honesto: abrir num separador novo,
 * copiar o endereço e o menu de contexto continuam a funcionar, que é o que se perde quando se
 * troca um link por um `<button>` com `history.back()`.
 */

/**
 * Chegámos a esta página de dentro da app?
 *
 * **O sinal é o `type` do `afterNavigate`, não o `from`.** Medido a 20/10/2026 no servidor de
 * desenvolvimento: depois de um recarregamento com `location.reload()`, o `from` vinha
 * preenchido e a seta recuava na história quando devia seguir o endereço. O `type` é o que o
 * SvelteKit documenta para isto: `enter` é a app a arrancar, e tudo o resto — `link`, `goto`,
 * `popstate`, `form` — é navegação de dentro.
 *
 * O `from` fica na conta à mesma, como segunda condição: um `enter` nunca tem `from`, mas se um
 * dia um tipo novo aparecer, mais vale cair no lado seguro — seguir o endereço, que funciona
 * sempre, em vez de recuar para fora da app.
 */
export function veioDeDentro(tipo: string | null | undefined, de: unknown): boolean {
	if (!tipo || tipo === 'enter') return false;
	return !!de;
}

/** O dia deste jogo, que é para onde se vai quando não há história. */
export function destinoDeVoltar(data: string | null | undefined): string {
	return data ? `/?dia=${data}` : '/';
}

/** As teclas e o botão do rato que transformam um clique em "abrir noutro sítio". */
export interface ModificadoresDoClique {
	meta?: boolean;
	ctrl?: boolean;
	shift?: boolean;
	alt?: boolean;
	/** 0 é o botão principal; 1 é o do meio, que abre num separador novo */
	botao?: number;
}

/**
 * Recuar na história em vez de seguir o `href`?
 *
 * Só quando as três coisas se verificam: viemos de dentro da app, o clique é com o botão
 * principal, e não traz modificador nenhum.
 *
 * **Os modificadores não são detalhe.** Um `cmd`+clique que recue na história em vez de abrir
 * num separador novo é um botão que mente, e é o erro mais fácil de cometer neste padrão —
 * fica aqui com teste em vez de ficar numa linha dentro do `.svelte` onde nenhum teste lhe
 * chega.
 */
export function recuarNaHistoria(deDentro: boolean, mod: ModificadoresDoClique = {}): boolean {
	if (!deDentro) return false;
	if ((mod.botao ?? 0) !== 0) return false;
	return !(mod.meta || mod.ctrl || mod.shift || mod.alt);
}
