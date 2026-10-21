/**
 * Que tabela mostrar, e se é nossa (B9.14/B9.15).
 *
 * A fonte não publica classificação nos Escolares nem nos Benjamins — são 8 séries e 43
 * equipas — e quem acompanha um filho nesses escalões andava a fazer as contas à mão. O
 * raspador passou a calculá-las, com o mesmo motor que reproduz as 42 tabelas publicadas.
 *
 * **A tabela da fonte manda sempre.** Onde ela publica, é a dela que se mostra: duas tabelas
 * para a mesma prova divergiriam no dia em que a nossa regra e a dela discordassem, e a app
 * passava a mostrar duas verdades.
 *
 * A calculada chega numa chave própria, `classificacao_calculada`, e não dentro da
 * `classificacao`. É de propósito: um telemóvel com um *build* antigo em cache mostraria a
 * nossa tabela sem o rótulo de "não oficial", porque o rótulo é interface nova. Com uma chave
 * nova, o código antigo ignora-a e continua a dizer "sem classificação publicada", que é a
 * verdade que ele conhece.
 */
import type { GrupoClassificacao } from './tipos';

export type Tabelas = {
	grupos: GrupoClassificacao[];
	/** `true` quando a tabela é nossa e tem de ir com o rótulo */
	calculada: boolean;
};

export function tabelasDe(
	ficheiro:
		| { classificacao?: GrupoClassificacao[]; classificacao_calculada?: GrupoClassificacao[] }
		| null
		| undefined
): Tabelas {
	if (ficheiro?.classificacao?.length) return { grupos: ficheiro.classificacao, calculada: false };
	const nossa = ficheiro?.classificacao_calculada ?? [];
	return { grupos: nossa, calculada: nossa.length > 0 };
}

/**
 * O que o separador "Classificação" de uma equipa mostra: `pontos`, `merito`, ou nada.
 *
 * ## Porque é que isto é uma função e não um `{#if}` dentro do ecrã
 *
 * Porque estava dentro do ecrã, e **esteve errado quatro dias sem ninguém dar por isso**. A
 * 10/10/2026 o Mérito entrou e a tabela de pontos dos Escolares e dos Benjamins deixou de ser
 * calculada — bem, porque é o Mérito que o Artigo 92.º manda usar ali. O ecrã da competição
 * passou a mostrar o Mérito; o da equipa continuou a decidir só pela tabela de pontos, e por
 * isso dizia *"Esta equipa não tem classificação publicada"* a quem abrisse o HC Sintra nos
 * Benjamins. Foi o dono que o encontrou, no telemóvel, a 14/10.
 *
 * A suite tinha 672 testes e nenhum deles podia apanhar isto: **nenhum monta um componente**.
 * Entre "os dados estão certos" — e estavam, o `/merito/465.json` teve sempre as 8 linhas — e
 * "o ecrã mostra alguma coisa" não havia camada nenhuma. Trazer a decisão para aqui põe-na ao
 * alcance de um teste com os dados verdadeiros, sem montar ecrã nenhum, que é a forma mais
 * barata de fechar a classe inteira de defeitos e não só este.
 *
 * **A ordem importa.** Onde há Mérito, é ele que manda: nesses escalões a classificação é
 * aquela, e uma tabela de pontos ao lado seriam duas verdades para a mesma prova.
 */
export type OQueMostrar = 'pontos' | 'merito' | 'nenhuma';

export function classificacaoDaEquipa(
	provas: {
		merito?: { linhas: { equipa: string }[] } | null;
		classificacao: GrupoClassificacao[];
	}[],
	equipa: string
): OQueMostrar {
	const temMerito = provas.some((p) => p.merito?.linhas.some((l) => l.equipa === equipa));
	if (temMerito) return 'merito';
	const temPontos = provas.some((p) =>
		p.classificacao.some((g) => g.linhas.some((l) => l.equipa === equipa))
	);
	return temPontos ? 'pontos' : 'nenhuma';
}

/**
 * O mesmo, para o separador "Classificação" da **ficha de jogo**.
 *
 * **É o terceiro ecrã da mesma história**, e foi preciso o dono pedi-lo a 21/10/2026: *"no meu
 * dos jogos, quando entro num jogo de Benjamins ou Escolares, quero ver a tabela de mérito"*.
 * A 10/10 o Mérito entrou no ecrã da competição; a 14/10 apanhou-se o da equipa, e escreveu-se
 * ali ao lado que verificar o ecrã que se mexeu não chega porque a avaria aparece no outro. E
 * mesmo assim este ficou de fora onze dias — a ficha de jogo nem sequer **pedia** o ficheiro do
 * Mérito, por isso não havia nada a decidir: o separador simplesmente não existia.
 *
 * Aqui a pergunta é mais simples do que na equipa, porque não há equipa nenhuma a filtrar: o
 * que interessa é se a prova tem tabela, e qual.
 *
 * **Medido a 21/10/2026 nas 37 provas publicadas:** 8 têm só Mérito — os Encontros Distritais
 * de Escolares e Benjamins —, 23 só tabela de pontos, 6 nenhuma das duas, e **zero têm as
 * duas**. A ordem — Mérito primeiro — não muda nada hoje, e fica igual à da equipa para não
 * haver duas regras para a mesma pergunta.
 *
 * As 6 sem nada não são defeito: são os jogos-treino, o Zeca Pinto e as Supertaças, que são
 * eliminatórias. Ali uma classificação não quer dizer nada — ver `vale_calcular` no raspador.
 */
export function classificacaoDoJogo(
	competicao:
		| { classificacao?: GrupoClassificacao[]; classificacao_calculada?: GrupoClassificacao[] }
		| null
		| undefined,
	merito: { linhas: unknown[] } | null | undefined
): OQueMostrar {
	if (merito?.linhas?.length) return 'merito';
	return tabelasDe(competicao).grupos.some((g) => g.linhas.length > 0) ? 'pontos' : 'nenhuma';
}
