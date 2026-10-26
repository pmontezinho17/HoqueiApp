import { describe, expect, it } from 'vitest';
import { balaoEncostado, LIMIAR_DO_BALAO } from './balao';

describe('o balão de opinião', () => {
	it('no topo da página fica inteiro, para quem chega o ver', () => {
		expect(balaoEncostado(0)).toBe(false);
		expect(balaoEncostado(LIMIAR_DO_BALAO)).toBe(false);
	});

	it('depois de rolar encosta-se à margem, para não tapar resultados', () => {
		expect(balaoEncostado(LIMIAR_DO_BALAO + 1)).toBe(true);
		expect(balaoEncostado(4000)).toBe(true);
	});

	it('o "puxar para actualizar" do iPhone dá scroll negativo, e isso é topo', () => {
		expect(balaoEncostado(-60)).toBe(false);
	});
});
