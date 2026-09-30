// Espelha o contrato em docs/02-arquitetura-e-stack.md.

export interface Competicao { id: number; nome: string; categoria: string; }
export interface Equipa { id: number; nome: string; logo: string | null; }

export interface Jogo {
	id: number | null;
	numero: string | null;
	grupo: string | null;
	jornada: string;
	data: string | null;
	hora: string | null;
	casa: string;
	fora: string;
	golos_casa: number | null;
	golos_fora: number | null;
	recinto: string | null;
}

export interface LinhaClassificacao {
	posicao: number; equipa: string;
	jogos: number; vitorias: number; empates: number; derrotas: number;
	golos_marcados: number; golos_sofridos: number; diferenca: number;
	racio: number | null; pontos: number;
}
export interface GrupoClassificacao { nome: string | null; linhas: LinhaClassificacao[]; }

export interface EventoJogo {
	ordem: number;
	tipo: 'golo' | 'falta_equipa' | 'cartao' | 'desconto_tempo' | 'penalti_falhado'
		| 'livre_direto_falhado' | 'inicio_parte' | 'fim_parte' | 'fim_jogo'
		| 'por_iniciar' | 'desconhecido';
	relogio: string | null;
	parte: number | null;
	minuto: number | null;
	equipa: string | null;
	jogador: string | null;
	assistencia: string | null;
	variante: string | null;
	numero: number | null;
	golos_casa: number | null;
	golos_fora: number | null;
	texto: string;
}

export interface LinhaJogador {
	numero: string | null; nome: string; titular: boolean;
	golos: number | null; assistencias: number | null; defesas: number | null;
	penalidades: string | null; livres_diretos: string | null; papel: string | null;
}
export interface EquipaFicha { nome: string; jogadores: LinhaJogador[]; }

export interface FichaJogo {
	id: number;
	competicao: string | null;
	competicao_id?: number;
	casa: string; fora: string;
	golos_casa: number | null; golos_fora: number | null;
	estado: string | null;
	data: string | null; hora: string | null; recinto: string | null;
	arbitros: string[];
	faltas: [number | null, number | null];
	equipas: EquipaFicha[];
	cronologia: EventoJogo[];
	/** presente e true quando o escalão é de formação e os nomes foram omitidos */
	individuais_omitidos?: boolean;
}

export interface FicheiroCompeticao {
	competicao: Competicao;
	competicao_id: number;
	temporada_id: number;
	equipas: Equipa[];
	jogos: Jogo[];
	classificacao: GrupoClassificacao[];
}

export interface IndiceCompeticoes { temporada: number; competicoes: Competicao[]; }

export interface Meta {
	generated_at: string;
	tenant: string;
	competicoes: number;
	jogos: number;
	fichas_publicadas: number;
	fonte: string;
}

export const disputado = (j: Jogo): boolean =>
	j.golos_casa !== null && j.golos_fora !== null;
