/**
 * O separador "Em pista" (07/11/2026): quem jogou cada período, nos Escolares e Benjamins.
 *
 * Pedido do dono numa sugestão pela app, e desenhado com ele no mesmo dia: a grelha do
 * separador Equipas com a barra de cada atleta — um bloco por período, cheio onde jogou — e os
 * golos **em número** dentro do bloco. As bolas uma a uma não cabiam: medido nos 110 jogos
 * destes escalões, um atleta chegou a marcar 7 golos num só período de 8 minutos, e 14 num jogo.
 *
 * O `J` é quem entrou a meio do período (`docs/09-regulamento-apl.md`): conta como meia parte
 * jogada e pesa no Mérito, e por isso vai a amarelo, como no separador do Mérito.
 */
import type { EquipaEmPista, FichaJogo } from './tipos';

export type EstadoNoPeriodo = 'jogou' | 'entrou' | 'fora';

export interface LinhaEmPista {
	numero: string | null;
	nome: string;
	gr: boolean;
	periodos: { estado: EstadoNoPeriodo; golos: number }[];
	/** o total do jogo; `null` quando a ficha não deixa contar os golos por período */
	golos: number | null;
}

export interface EquipaNaPista {
	equipa: string;
	linhas: LinhaEmPista[];
	/** o 87.º 7.4: cada atleta faz uma meia parte de cada parte — o 1º ou o 2º, e o 3º ou o 4º */
	semAsDuasPartes: number;
	/** quem entrou a meio, e em que período (1 a 4) */
	entradas: { nome: string; periodo: number }[];
}

/** Qualquer marca conta como jogada, e não só o `X` — a mesma regra do raspador. */
function estado(marca: string): EstadoNoPeriodo {
	const m = (marca ?? '').trim().toUpperCase();
	return m === 'J' ? 'entrou' : m ? 'jogou' : 'fora';
}

function daEquipa(e: EquipaEmPista): EquipaNaPista {
	const linhas = e.atletas.map((a) => ({
		numero: a.numero,
		nome: a.nome,
		gr: a.gr,
		periodos: [0, 1, 2, 3].map((i) => ({ estado: estado(a.marcas[i]), golos: a.golos?.[i] ?? 0 })),
		golos: a.golos ? a.golos.reduce((s, g) => s + g, 0) : null
	}));
	const jogou = (l: LinhaEmPista, i: number) => l.periodos[i].estado !== 'fora';
	return {
		equipa: e.equipa,
		linhas,
		semAsDuasPartes: linhas.filter((l) => !(jogou(l, 0) || jogou(l, 1)) || !(jogou(l, 2) || jogou(l, 3)))
			.length,
		entradas: linhas.flatMap((l) =>
			l.periodos.flatMap((p, i) => (p.estado === 'entrou' ? [{ nome: l.nome, periodo: i + 1 }] : []))
		)
	};
}

/** As duas equipas, ou `null` quando não há grelha — e aí o separador não aparece. */
export function emPistaDoJogo(f: Pick<FichaJogo, 'em_pista'>): EquipaNaPista[] | null {
	const e = f.em_pista;
	if (!Array.isArray(e) || e.length !== 2 || !e.some((x) => x.atletas?.length)) return null;
	return e.map(daEquipa);
}
