// Espelha o contrato em docs/02-arquitetura-e-stack.md.

export interface Competicao {
	id: number; nome: string; categoria: string;
	/** séries da mesma prova partilham `grupo_id`; `serie` é null em prova de série única */
	grupo_id?: string; grupo_nome?: string; serie?: string | null;
}
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
	penalidades: string | null; livres_diretos: string | null;
	cartoes_amarelos: number; cartoes_azuis: number; cartoes_vermelhos: number;
	papel: string | null;
}
export interface EquipaFicha { nome: string; jogadores: LinhaJogador[]; }

export interface Parcial { nome: string; casa: number | null; fora: number | null; }

/**
 * O boletim oficial de jogo. **`null` é o caso normal**, não a excepção: só aparece minutos
 * depois do apito final e nunca aparece nos escalões de formação.
 */
export interface Boletim {
	oficiais: Record<string, string>;
	parciais: Parcial[];
	faltas_casa: number[];
	faltas_fora: number[];
	inicio: string[];
	termo: string[];
	capitao_casa: string | null;
	capitao_fora: string | null;
}

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
	boletim?: Boletim | null;
	/** o que a fonte diz estar a acontecer: "1ª Parte (13:26)", "Intervalo", "Jogo Terminado" */
	situacao?: string | null;
	/** só num jogo a decorrer: "2ª Parte" ou "Intervalo", e o relógio quando há */
	periodo?: string | null;
	relogio?: string | null;
	/** presente e true quando o escalão é de formação e os nomes foram omitidos */
	individuais_omitidos?: boolean;
	/** contexto para as migalhas (W7.3) */
	categoria?: string; jornada?: string;
	grupo_id?: string; grupo_nome?: string; serie?: string | null;
}

export interface FicheiroCompeticao {
	competicao: Competicao;
	competicao_id: number;
	temporada_id: number;
	equipas: Equipa[];
	jogos: Jogo[];
	classificacao: GrupoClassificacao[];
	/** A tabela que **nós** calculamos, quando a fonte não publica nenhuma. Chave própria de
	 *  propósito — ver `$lib/classificacao.ts`. Opcional porque os ficheiros publicados antes
	 *  de 07/10/2026 não a têm, e um cliente novo pode ler um ficheiro antigo em cache. */
	classificacao_calculada?: GrupoClassificacao[];
}

/**
 * Mérito da Formação (Artigo 92.º do regulamento da APL) — ficheiro próprio, `/v1/.../merito/<id>.json`.
 *
 * Caminho novo e não uma chave no `comp/`: os telemóveis têm o `comp/` em cache e um campo
 * novo lá dentro só aparecia quando a cache caducasse. Um ficheiro à parte ou existe ou dá
 * 404, e o 404 é uma resposta honesta — "esta prova não tem Mérito".
 */
export interface LinhaMerito {
	posicao: number;
	equipa: string;
	jogos: number;
	/** soma dos atletas que entraram em jogo, somada ao longo da prova */
	participantes: number;
	bonificacao: number;
	/** negativa ou zero */
	penalizacao: number;
	pontos: number;
	/** pontos por jogo: as equipas não jogam todas o mesmo número de jogos */
	media: number;
	/** jogos onde há uma penalização que depende de algo que o boletim não mostra */
	por_confirmar: number;
}

export interface FicheiroMerito {
	competicao_id: number;
	nome: string;
	jogos_lidos: number;
	/** jogos disputados cujo boletim a fonte não publicou: a tabela está incompleta assim */
	jogos_sem_boletim: number;
	linhas: LinhaMerito[];
}

export interface IndiceCompeticoes { temporada: number; competicoes: Competicao[]; }

/** Linha da agenda transversal: campos ao mínimo, porque são ~800 numa só resposta. */
export interface JogoAgenda {
	id: number | null;
	data: string;
	hora: string | null;
	casa: string; fora: string;
	gc: number | null; gf: number | null;
	recinto: string | null;
	comp: number; prova: string; cat: string;
	/** posto pela ronda ao vivo. Só vale dentro da janela de horas do jogo — ver `emCurso()`. */
	ao_vivo?: boolean;
	/** também postos pela ronda ao vivo, e apagados quando o jogo fecha: o minuto do jogo
	 *  na própria lista, para se saber se vale a pena entrar. Ao intervalo não há `relogio`
	 *  e é a `situacao` que o diz. */
	periodo?: string | null;
	relogio?: string | null;
	situacao?: string | null;
	/** há ficha publicada para um jogo ainda por disputar: dá os convocados */
	tem_ficha?: boolean;
	grupo_id?: string; grupo_nome?: string; serie?: string | null;
}
export interface Agenda { jogos: JogoAgenda[]; }

export interface EquipaIndice { equipa: string; categoria: string; competicoes: number[]; }
export interface IndiceEquipas { equipas: EquipaIndice[]; }

/** Seguir é por clube **e** escalão: quem segue os sub-15 não quer os seniores. */
export interface Favorito { equipa: string; categoria: string; competicoes: number[]; }

export interface TotaisJogador {
	nome: string; equipa: string; jogos: number;
	golos: number; assistencias: number; defesas: number; pontos: number;
	numero?: string | null;
	amarelos?: number; azuis?: number; vermelhos?: number;
}
export interface Quadro {
	competicao_id: number;
	jogos_considerados: number;
	jogadores: TotaisJogador[];
	/** a fonte só regista defesas numa minoria das fichas */
	tem_defesas: boolean;
}

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
