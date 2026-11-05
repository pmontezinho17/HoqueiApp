import { describe, expect, it } from 'vitest';
import { aoRolar, LIMIAR, TOPO, type EstadoBarra } from './barra';

/** percorre uma sequência de posições como se fossem eventos de `scroll` */
function rolar(posicoes: number[], inicio: EstadoBarra = { recolhida: false, desde: 0 }) {
	return posicoes.reduce(aoRolar, inicio);
}

describe('a barra de baixo a recolher', () => {
	it('recolhe-se a descer, e volta inteira a subir', () => {
		const descida = rolar([100, 200, 300]);
		expect(descida.recolhida).toBe(true);
		expect(rolar([280], descida).recolhida).toBe(false);
	});

	it('não muda com o tremor do dedo', () => {
		const parado = rolar([100, 100 + LIMIAR]);
		expect(parado.recolhida).toBe(true);
		expect(rolar([parado.desde - 3, parado.desde + 2, parado.desde - 4], parado).recolhida).toBe(true);
	});

	it('um deslize lento, de 2 em 2 píxeis, também a recolhe', () => {
		const lento = Array.from({ length: 40 }, (_, i) => 100 + i * 2);
		expect(rolar(lento, { recolhida: false, desde: 100 }).recolhida).toBe(true);
	});

	it('a subida conta desde o ponto mais fundo, e não desde onde recolheu', () => {
		// recolheu aos 112, desceu até aos 400, e subir 20 tem de chegar para voltar
		const fundo = rolar([112, 200, 400], { recolhida: false, desde: 100 });
		expect(rolar([380], fundo).recolhida).toBe(false);
	});

	it('perto do topo está sempre inteira, venha de onde vier', () => {
		const recolhida: EstadoBarra = { recolhida: true, desde: 500 };
		expect(aoRolar(recolhida, TOPO).recolhida).toBe(false);
		// o iPhone deixa puxar a página para lá do topo, e a posição fica negativa
		expect(aoRolar(recolhida, -30).recolhida).toBe(false);
	});
});
