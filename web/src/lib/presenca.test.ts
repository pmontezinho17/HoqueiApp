import { describe, expect, it, vi } from 'vitest';
import { decidir, diaDeLisboa, marcarPresenca } from './presenca';

/**
 * A regra de contar **uma vez por dia e por aparelho**, sem identificador.
 *
 * O que estes testes guardam é a propriedade que torna isto honesto: o servidor recebe um
 * toque e não recebe nada que o ligue ao toque de ontem.
 */
describe('decidir se este aparelho já foi contado hoje', () => {
	const hoje = '2026-10-08';

	it('aparelho novo: conta, e conta como novo', () => {
		expect(decidir({ dia: null, conhecido: null }, hoje)).toEqual({ novo: true });
	});

	it('aparelho conhecido num dia novo: conta, mas já não é novo', () => {
		expect(decidir({ dia: '2026-10-07', conhecido: '1' }, hoje)).toEqual({ novo: false });
	});

	it('já contado hoje: não faz nada, por mais vezes que a app abra', () => {
		expect(decidir({ dia: hoje, conhecido: '1' }, hoje)).toBe(null);
	});

	it('a data em Lisboa, e não em UTC', () => {
		// 23:30 em Londres já é o dia seguinte em Lisboa, no horário de verão
		expect(diaDeLisboa(new Date('2026-10-08T22:30:00Z'))).toBe('2026-10-08');
		expect(diaDeLisboa(new Date('2026-10-08T23:30:00Z'))).toBe('2026-10-09');
	});
});

/** Um armazenamento de brincar, que é tudo o que o `marcarPresenca` precisa. */
const armazem = (inicial: Record<string, string> = {}) => {
	const m = new Map(Object.entries(inicial));
	return {
		getItem: (k: string) => m.get(k) ?? null,
		setItem: (k: string, v: string) => void m.set(k, v),
		ver: () => Object.fromEntries(m)
	};
};

describe('o pedido que sai', () => {
	it('leva o bit de "novo" e mais nada — nenhum identificador', () => {
		const a = armazem();
		const buscar = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
		marcarPresenca(buscar as unknown as typeof fetch, a);
		expect(buscar).toHaveBeenCalledTimes(1);
		const [url] = buscar.mock.calls[0];
		expect(url).toBe('/contar?novo=1');
		// o endereço não leva nada além do bit
		expect(String(url).split('?')[1]).toBe('novo=1');
	});

	it('a segunda abertura do mesmo dia não chama ninguém', () => {
		const a = armazem();
		const buscar = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
		marcarPresenca(buscar as unknown as typeof fetch, a);
		marcarPresenca(buscar as unknown as typeof fetch, a);
		marcarPresenca(buscar as unknown as typeof fetch, a);
		expect(buscar).toHaveBeenCalledTimes(1);
	});

	it('o que fica guardado é uma data e um bit — nada que identifique', () => {
		const a = armazem();
		marcarPresenca(vi.fn().mockResolvedValue(new Response(null, { status: 204 })) as unknown as typeof fetch, a);
		const guardado = a.ver();
		expect(Object.keys(guardado).sort()).toEqual(['hoquei:conhecido:v1', 'hoquei:contado:v1']);
		expect(guardado['hoquei:conhecido:v1']).toBe('1');
		expect(guardado['hoquei:contado:v1']).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});

	it('no dia seguinte volta a contar, e já não como novo', () => {
		const a = armazem();
		const buscar = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
		marcarPresenca(buscar as unknown as typeof fetch, a);
		a.setItem('hoquei:contado:v1', '2000-01-01');
		marcarPresenca(buscar as unknown as typeof fetch, a);
		expect(buscar).toHaveBeenCalledTimes(2);
		expect(buscar.mock.calls[1][0]).toBe('/contar?novo=0');
	});

	/** Um aparelho que não consegue guardar a data contaria em cada abertura. */
	it('com o armazenamento bloqueado, não conta', () => {
		const buscar = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
		const bloqueado = {
			getItem() {
				throw new Error('bloqueado');
			},
			setItem() {
				throw new Error('bloqueado');
			}
		};
		marcarPresenca(buscar as unknown as typeof fetch, bloqueado);
		expect(buscar).not.toHaveBeenCalled();
	});

	/** O `fetch` pode atirar antes de devolver promessa — por exemplo, bloqueado por CSP. */
	it('um fetch que atira não parte a app', () => {
		const a = armazem();
		const explode = () => {
			throw new Error('bloqueado pela política de segurança');
		};
		expect(() => marcarPresenca(explode as unknown as typeof fetch, a)).not.toThrow();
	});

	/** Em SSR não há armazenamento nenhum, e isto corre no arranque da app. */
	it('sem armazenamento nenhum, não estoura', () => {
		const buscar = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
		marcarPresenca(buscar as unknown as typeof fetch, null);
		expect(buscar).not.toHaveBeenCalled();
	});
});
