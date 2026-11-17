import { registar, type Inquilino } from './inquilinos';
import type { Competicao, EquipaIndice, JogoAgenda } from './tipos';

/** O que o layout carrega de cada fonte. */
export interface IndicesDeUmaFonte {
	competicoes: Competicao[];
	agenda: JogoAgenda[];
	equipas: EquipaIndice[];
	emblemas: Record<string, string>;
}

/**
 * Junta a APL e a FPP numa só lista de cada coisa, marca as linhas da FPP e regista os números.
 *
 * **A FPP pode não estar publicada**, e isso não é uma avaria: é o estado de produção antes da
 * primeira entrega com as ligas nacionais, e é o de um telemóvel que abriu a app sem rede depois
 * de uma versão antiga ter posto a APL na cache. Nesse caso chega `null` e a app é a de sempre.
 *
 * **Os emblemas juntam-se pelo nome, e o da APL ganha.** Medido a 17/11/2026: 12 nomes existem
 * nas duas fontes — o AD OEIRAS, o PAREDE FC, o SL BENFICA — e são os mesmos clubes. O emblema
 * da APL é o que a app já mostrava, e trocá-lo por o da FPP mudava a cara de um clube a quem já
 * o conhece.
 */
export function juntarFontes(apl: IndicesDeUmaFonte, fpp: IndicesDeUmaFonte | null): IndicesDeUmaFonte {
	registar('aplisboa', { competicoes: apl.competicoes.map((c) => c.id), jogos: apl.agenda.map((j) => j.id) });
	if (!fpp) return apl;
	registar('fpp', { competicoes: fpp.competicoes.map((c) => c.id), jogos: fpp.agenda.map((j) => j.id) });
	const marcar = <T extends object>(xs: T[]): (T & { inq: Inquilino })[] =>
		xs.map((x) => ({ ...x, inq: 'fpp' as const }));
	return {
		competicoes: [...apl.competicoes, ...marcar(fpp.competicoes)],
		agenda: [...apl.agenda, ...marcar(fpp.agenda)],
		equipas: [...apl.equipas, ...marcar(fpp.equipas)],
		emblemas: { ...fpp.emblemas, ...apl.emblemas }
	};
}
