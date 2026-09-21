// Espelha o contrato em docs/02-arquitetura-e-stack.md. Os campos são os que o scraper
// escreve; nomes em português para não haver tradução a meio do caminho.

export interface Competicao {
	id: number;
	nome: string;
	categoria: string;
}

export interface Equipa {
	id: number;
	nome: string;
	logo: string | null;
}

export interface Jogo {
	id: number | null;
	numero: string | null;
	grupo: string | null;
	jornada: string;
	data: string | null; // ISO, "2026-09-19"
	hora: string | null; // "18:00:00"
	casa: string;
	fora: string;
	golos_casa: number | null;
	golos_fora: number | null;
	recinto: string | null;
}

export interface LinhaClassificacao {
	posicao: number;
	equipa: string;
	jogos: number;
	vitorias: number;
	empates: number;
	derrotas: number;
	golos_marcados: number;
	golos_sofridos: number;
	diferenca: number;
	racio: number | null;
	pontos: number;
}

export interface GrupoClassificacao {
	nome: string | null;
	linhas: LinhaClassificacao[];
}

export interface FicheiroCompeticao {
	competicao: Competicao;
	competicao_id: number;
	temporada_id: number;
	equipas: Equipa[];
	jogos: Jogo[];
	classificacao: GrupoClassificacao[];
}

export interface IndiceCompeticoes {
	temporada: number;
	competicoes: Competicao[];
}

export const disputado = (j: Jogo): boolean =>
	j.golos_casa !== null && j.golos_fora !== null;
