import { registar, type Inquilino } from './inquilinos';
import type { Competicao, EquipaIndice, JogoAgenda } from './tipos';

/**
 * **Os clubes que a FPP escreve de outra maneira**, e o nome da equipa da APL de quem herdam o
 * emblema. É o emblema que diz à app que é o mesmo clube: o "O Meu Clube" agrupa por ele.
 *
 * Medido a 17/11/2026 nos 97 nomes das três divisões, comparando os emblemas das duas fontes
 * (diferença de 0 a 256 numa grelha de 16×16): os que diferem só no patrocinador ou na escrita
 * e têm o emblema igual (0) juntaram-se logo; os outros seis o dono confirmou um a um nesse dia —
 * o CANDELARIA SC, que tem o nome igual e o emblema diferente (119), o HCP GRANDOLA (27), o GD
 * CRIAR - T (13), o HC MEALHADA, o SC TOMAR e o S. ALENQUER B. Os 20 com o nome igual nas duas
 * fontes não precisam de estar aqui: juntam-se pelo nome.
 */
export const MESMO_CLUBE: Record<string, string> = {
	'HC SINTRA/PLANTA LIVRE': 'HC SINTRA',
	'HC VASCO DA GAMA/JASCENSAO': 'HC VASCO GAMA',
	'F. SALESIANOS/AJ SALESIANA': 'FSE/AJ SALESIANA',
	'A STUART HC MASSAMA': 'A STUART HCM',
	// a própria FPP escreve o clube de duas maneiras: "CD PAÇO ARCOS" na 2.ª, isto na 3.ª
	'CD PAÇO DE ARCOS B': 'CD PAÇO ARCOS',
	'HCP GRANDOLA': 'HC GRANDOLA',
	'GD CRIAR - T': 'CRIAR-T GD',
	'HC MEALHADA': 'HC MEALHADA (S17)',
	'HC MEALHADA B': 'HC MEALHADA (S17)',
	'SC TOMAR / IPT': 'SC TOMAR',
	// "S ALENQUER B" é o Benfica de Alenquer, e não uma equipa B (ver `clubes.ts`)
	'S. ALENQUER B': 'S ALENQUER BENFICA',
	'S. ALENQUER B B': 'S ALENQUER BENFICA',
	'HC TURQUEL B': 'HC TURQUEL'
};

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
		emblemas: { ...fpp.emblemas, ...doMesmoClube(apl.emblemas), ...apl.emblemas }
	};
}

/** Os emblemas da APL com o nome que a FPP usa, para as equipas de `MESMO_CLUBE`. */
function doMesmoClube(emblemasDaApl: Record<string, string>): Record<string, string> {
	const r: Record<string, string> = {};
	for (const [fpp, apl] of Object.entries(MESMO_CLUBE)) if (emblemasDaApl[apl]) r[fpp] = emblemasDaApl[apl];
	return r;
}
