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
