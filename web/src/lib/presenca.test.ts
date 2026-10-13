import { describe, expect, it, vi } from 'vitest';
import {
	PAUSA_DE_SESSAO,
	decidir,
	decidirSessao,
	diaDeLisboa,
	marcarPresenca,
	marcarSessao
} from './presenca';

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

/**
 * A contagem de **sessões**, que substituiu o `aberturas` a 13/10/2026.
 *
 * O número antigo vinha do servidor, amostrado 1 em 10 dos pedidos de dados, e morreu quando o
 * `/v1/*` saiu do caminho das Functions para parar de esgotar a quota e derrubar produção.
 * Este vem do cliente e tem uma definição que se diz numa frase: *a app foi aberta, ou
 * retomada depois de meia hora parada*.
 *
 * O que estes testes guardam é a mesma propriedade do contador de aparelhos — o que sai é um
 * toque sem nada que identifique ninguém — mais as duas horas em que isto se engana: o relógio
 * do aparelho e o armazenamento bloqueado.
 */
describe('decidir se esta abertura é uma sessão nova', () => {
	const agora = Date.parse('2026-10-13T21:00:00Z');

	it('a primeira de sempre conta', () => {
		expect(decidirSessao(null, agora)).toEqual({ desde: new Date(agora).toISOString() });
	});

	it('logo a seguir não conta', () => {
		const ha5min = new Date(agora - 5 * 60_000).toISOString();
		expect(decidirSessao(ha5min, agora)).toBeNull();
	});

	it('mesmo no limite da pausa ainda não conta', () => {
		const quase = new Date(agora - (PAUSA_DE_SESSAO * 60_000 - 1)).toISOString();
		expect(decidirSessao(quase, agora)).toBeNull();
	});

	it('passada a pausa, conta outra vez', () => {
		const exacto = new Date(agora - PAUSA_DE_SESSAO * 60_000).toISOString();
		expect(decidirSessao(exacto, agora)).not.toBeNull();
	});

	it('uma marca ilegível conta como nunca, e não emudece o aparelho', () => {
		expect(decidirSessao('ontem à tarde', agora)).not.toBeNull();
		expect(decidirSessao('', agora)).not.toBeNull();
	});

	it('uma marca no futuro conta, senão o aparelho desaparecia das contas', () => {
		// Um relógio adiantado — por engano, ou por alguém a brincar — deixaria este aparelho
		// calado até a data chegar. Contar uma sessão a mais é o modo de falha a preferir.
		const amanha = new Date(agora + 24 * 3600_000).toISOString();
		expect(decidirSessao(amanha, agora)).not.toBeNull();
	});
});

describe('o toque da sessão', () => {
	const resposta = () => vi.fn().mockResolvedValue(new Response(null, { status: 204 }));

	it('leva `sessao=1` e mais nada — nenhum identificador', () => {
		const a = armazem();
		const buscar = resposta();
		marcarSessao(buscar as unknown as typeof fetch, a, Date.parse('2026-10-13T21:00:00Z'));
		expect(buscar).toHaveBeenCalledTimes(1);
		expect(buscar.mock.calls[0][0]).toBe('/contar?sessao=1');
		expect(String(buscar.mock.calls[0][0]).split('?')[1]).toBe('sessao=1');
	});

	it('o que fica guardado é uma marca de tempo, e só essa chave', () => {
		const a = armazem();
		marcarSessao(resposta() as unknown as typeof fetch, a, Date.parse('2026-10-13T21:00:00Z'));
		expect(Object.keys(a.ver())).toEqual(['hoquei:sessao:v1']);
		expect(a.ver()['hoquei:sessao:v1']).toBe('2026-10-13T21:00:00.000Z');
	});

	it('abrir e fechar a app dez vezes seguidas conta uma sessão', () => {
		const a = armazem();
		const buscar = resposta();
		const t = Date.parse('2026-10-13T21:00:00Z');
		for (let i = 0; i < 10; i++) {
			marcarSessao(buscar as unknown as typeof fetch, a, t + i * 60_000);
		}
		expect(buscar).toHaveBeenCalledTimes(1);
	});

	it('voltar à app depois do jantar conta outra', () => {
		const a = armazem();
		const buscar = resposta();
		const t = Date.parse('2026-10-13T19:00:00Z');
		marcarSessao(buscar as unknown as typeof fetch, a, t);
		marcarSessao(buscar as unknown as typeof fetch, a, t + 90 * 60_000);
		expect(buscar).toHaveBeenCalledTimes(2);
	});

	it('com o armazenamento bloqueado, não conta', () => {
		// Sem conseguir guardar a marca, contaria em cada abertura e inflacionava o número.
		// Preferir um número baixo e verdadeiro a um número alto e inventado — é a mesma regra
		// do contador de aparelhos.
		const bloqueado = {
			getItem: () => {
				throw new Error('bloqueado');
			},
			setItem: () => {
				throw new Error('bloqueado');
			}
		};
		const buscar = resposta();
		marcarSessao(buscar as unknown as typeof fetch, bloqueado);
		expect(buscar).not.toHaveBeenCalled();
	});

	it('um fetch que atira não parte a app', () => {
		const a = armazem();
		const rebenta = (() => {
			throw new Error('bloqueado por política');
		}) as unknown as typeof fetch;
		expect(() => marcarSessao(rebenta, a)).not.toThrow();
	});

	it('sem armazenamento nenhum, não estoura', () => {
		expect(() => marcarSessao(resposta() as unknown as typeof fetch, null)).not.toThrow();
	});
});
