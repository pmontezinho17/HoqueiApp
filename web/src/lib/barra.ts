/**
 * A barra de baixo recolhe-se a descer e volta a subir (pedido do dono a 05/11/2026, a partir
 * de uma app de futebol que ele usa: *"quando se anda para baixo ela reduz o seu tamanho"*).
 *
 * Recolhida perde os rótulos e fica só com os ícones; **não desaparece**, porque a escolha foi
 * essa — os três destinos continuam a um toque em qualquer ponto da página.
 *
 * Esta lógica saiu e voltou a 05/11/2026 sem mudar uma linha. O que o dono achou *"terrível"* na
 * primeira versão não era recolher: era a barra ter a largura do ecrã e recolher só na altura,
 * de modo que mal se notava. O que mudou foi o CSS do `+layout.svelte`.
 *
 * Fora do `.svelte` para se poder testar sem montar o componente (ver `AGENTS.md`).
 */

/** Perto do topo a barra está sempre inteira: é onde se chega a cada página nova. */
export const TOPO = 24;

/**
 * Quanto é preciso andar para a barra mudar.
 *
 * Sem isto ela mudava a cada píxel de tremor do dedo, e um polegar parado num ecrã de vidro
 * nunca está parado. Mede-se desde o último sítio onde ela mudou, não desde o último evento,
 * senão um deslize lento — muitos eventos de 2 px — nunca a recolhia.
 */
export const LIMIAR = 12;

export interface EstadoBarra {
	recolhida: boolean;
	/** a posição a partir da qual se mede o próximo movimento */
	desde: number;
}

export function aoRolar(estado: EstadoBarra, y: number): EstadoBarra {
	if (y <= TOPO) return { recolhida: false, desde: y };
	const andou = y - estado.desde;
	if (andou >= LIMIAR) return { recolhida: true, desde: y };
	if (andou <= -LIMIAR) return { recolhida: false, desde: y };
	// a meio caminho do limiar: fica como está, mas segue o dedo no sentido em que já ia,
	// para que inverter o sentido conte a partir do ponto mais longe e não do de partida
	if (estado.recolhida ? andou > 0 : andou < 0) return { recolhida: estado.recolhida, desde: y };
	return estado;
}
