/**
 * O tempo de cada acontecimento do jogo, escrito como a APL o escreve na ficha.
 *
 * Até 07/11/2026 mostrávamos o minuto corrido do jogo (`minuto`, que o raspador calcula):
 * na 2ª parte de um Sub-13 os eventos iam de 18' a 36'. O dono pediu o contrário — *"seguir
 * o que a APL já faz nas fichas de jogo"*: o relógio de cada parte, **decrescente**, que
 * começa nos 18:00 de uma parte de 18 minutos e acaba nos 0:00. É o relógio que está no
 * pavilhão e o que a mesa escreve, e por isso o que quem esteve no jogo reconhece.
 *
 * O `minuto` continua no contrato `/v1`: há telemóveis com builds antigos que o lêem.
 */
import type { EventoJogo } from './tipos';

export interface TempoDoEvento {
	/** o relógio da parte, tal como a fonte o dá: "17:49", "0:03" */
	relogio: string;
	/** a parte, curta: "1ª", "2ª", ou "1ª prol." no prolongamento */
	parte: string;
}

const RELOGIO = /^(\d{1,2}):(\d{2})$/;

function segundos(relogio: string | null): number | null {
	const m = relogio ? RELOGIO.exec(relogio.trim()) : null;
	return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/**
 * O prolongamento recomeça a contagem: a fonte escreve "Início da 1ª parte do tempo extra"
 * com `parte: 1`, e sem isto a marca dizia "1ª parte" duas vezes no mesmo jogo.
 */
const eProlongamento = (e: EventoJogo) => /tempo extra|prolongamento/i.test(e.texto);

/** As marcas que abrem e fecham partes não têm tempo próprio que interesse mostrar. */
const ESTRUTURA = new Set(['inicio_parte', 'fim_parte', 'fim_jogo', 'por_iniciar']);

/**
 * O tempo a mostrar em cada evento, por `ordem`. Um evento sem tempo não está no mapa.
 *
 * Ficam de fora:
 * - o desempate por penáltis, que a fonte marca `PTY` — já não há relógio;
 * - o relógio **maior do que a parte**, que é um erro da mesa. Medido a 07/11/2026 nas 548
 *   fichas publicadas: 16 de 13 802 eventos, em 14 jogos, quase todos descontos de tempo com
 *   minutos redondos ("34:00" numa parte de 18 minutos). O minuto corrido escondia-os como
 *   0'; mostrados à letra eram um número impossível.
 */
export function temposDaCronologia(eventos: EventoJogo[]): Map<number, TempoDoEvento> {
	const tempos = new Map<number, TempoDoEvento>();
	let duracao: number | null = null;
	let prolongamento = false;
	for (const e of eventos) {
		const s = segundos(e.relogio);
		if (e.tipo === 'inicio_parte') {
			duracao = s;
			prolongamento = eProlongamento(e);
			continue;
		}
		if (ESTRUTURA.has(e.tipo) || s === null) continue;
		if (duracao !== null && s > duracao) continue;
		tempos.set(e.ordem, {
			relogio: e.relogio!.trim(),
			parte: e.parte ? `${e.parte}ª${prolongamento ? ' prol.' : ''}` : ''
		});
	}
	return tempos;
}

/** O nome da parte na marca que a abre: "2ª parte", "1ª parte do prolongamento". */
export function nomeDaParte(e: EventoJogo): string {
	return `${e.parte ?? 1}ª parte${eProlongamento(e) ? ' do prolongamento' : ''}`;
}
