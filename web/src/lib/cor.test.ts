/**
 * A cor escolhível, e a partilha. Dois pedidos do dono a 10/10/2026, testados onde são puros.
 */
import { describe, expect, it } from 'vitest';
import { CORES, OMISSAO, interpretar } from './cor.svelte';
import { ENDERECO, TEXTO } from './partilha';
import { PRODUCAO } from './ambiente.js';

describe('a cor escolhida', () => {
	it('o que não é uma cor da paleta cai no verde', () => {
		for (const cru of [null, '', 'dourado', 'VERDE', '#ff0000'])
			expect(interpretar(cru), JSON.stringify(cru)).toBe(OMISSAO);
	});

	it('uma cor da paleta é aceite tal e qual', () => {
		for (const c of CORES) expect(interpretar(c.valor)).toBe(c.valor);
	});

	it('o verde é a omissão, e é o verde que a app sempre teve', () => {
		expect(OMISSAO).toBe('verde');
		expect(CORES[0].claro).toBe('#0a7d54');
		expect(CORES[0].escuro).toBe('#34d399');
	});

	it('cada cor traz os quatro valores, e todos são cores', () => {
		/**
		 * Faltar um dava um `var()` sem valor e o acento caía no fallback **de um tema só** —
		 * uma app azul no claro e verde no escuro. O defeito era silencioso: nada rebenta.
		 */
		for (const c of CORES)
			for (const campo of ['claro', 'escuro', 'fracoClaro', 'fracoEscuro'] as const)
				expect(c[campo], `${c.valor}.${campo}`).toMatch(/^#[0-9a-f]{6}$/);
	});

	it('todas têm nome legível, que é o que quem lê por voz ouve', () => {
		for (const c of CORES) expect(c.rotulo.trim()).not.toBe('');
	});

	it('há cores que cheguem para valer a pena, e não tantas que não se escolha', () => {
		expect(CORES.length).toBeGreaterThanOrEqual(4);
		expect(CORES.length).toBeLessThanOrEqual(8);
	});
});

describe('partilhar a aplicação', () => {
	/**
	 * O endereço é sempre o de produção, nunca o da barra. Foi o dono que, na manhã deste
	 * mesmo dia, partilhou o endereço do site de testes por não ter nada à mão que
	 * partilhasse o certo — e um botão de partilha que copiasse `location.href` repetia o
	 * engano a partir de um site de ramo.
	 */
	it('partilha produção, e não o endereço onde a pessoa está', () => {
		expect(ENDERECO).toBe(`https://${PRODUCAO}`);
		expect(ENDERECO).not.toContain('testes');
	});

	it('leva uma frase que diz o que a app é', () => {
		expect(TEXTO).toMatch(/h[óo]quei/i);
		expect(TEXTO.length).toBeGreaterThan(40);
	});
});

describe('de onde vêm os dados', () => {
	/**
	 * O defeito de 10/10/2026, e porque é que merece teste próprio.
	 *
	 * O site de testes passou a ler os dados de produção, para ser fresco. Mas o site de
	 * testes leva **código novo**, e código novo traz ficheiros novos: os do Mérito da
	 * Formação existiram lá dias antes de existirem em produção. Sem a segunda tentativa, o
	 * separador da classificação dos Escolares ficou vazio — produção devolvia a página de
	 * fallback para um ficheiro que não tinha, e a tabela de vitórias que antes preenchia
	 * aquele espaço tinha sido removida no mesmo dia.
	 */
	const semLocation = () => {
		const antes = (globalThis as { location?: unknown }).location;
		delete (globalThis as { location?: unknown }).location;
		return () => {
			if (antes === undefined) delete (globalThis as { location?: unknown }).location;
			else (globalThis as { location?: unknown }).location = antes;
		};
	};

	async function carregar(anfitriao: string, respostas: Record<string, string | null>) {
		const repor = semLocation();
		(globalThis as { location?: unknown }).location = { hostname: anfitriao };
		const pedidos: string[] = [];
		const f = (async (u: string) => {
			pedidos.push(u);
			const corpo = respostas[u];
			// um ficheiro que não existe devolve a página de fallback com estado 200, que é
			// exactamente o que produção faz — ver o `pedir`
			return new Response(corpo ?? '<!doctype html><html></html>', { status: 200 });
		}) as unknown as typeof fetch;
		const { carregarMerito } = await import('./dados');
		try {
			return { dados: await carregarMerito(461, f), pedidos };
		} catch (e) {
			return { erro: e, pedidos };
		} finally {
			repor();
		}
	}

	const CAMINHO = '/v1/aplisboa/2026-27/merito/461.json';
	const EM_PRODUCAO = `https://hoquei.pages.dev${CAMINHO}`;
	const CORPO = JSON.stringify({ competicao_id: 461, linhas: [] });

	it('num site de ramo pede primeiro a produção', async () => {
		const r = await carregar('testes.hoquei.pages.dev', { [EM_PRODUCAO]: CORPO });
		expect(r.pedidos[0]).toBe(EM_PRODUCAO);
		expect(r.dados?.competicao_id).toBe(461);
	});

	it('e cai para a cópia local quando produção não tem o ficheiro', async () => {
		const r = await carregar('testes.hoquei.pages.dev', {
			[EM_PRODUCAO]: null,
			[CAMINHO]: CORPO
		});
		expect(r.pedidos).toEqual([EM_PRODUCAO, CAMINHO]);
		expect(r.dados?.competicao_id).toBe(461);
	});

	it('em produção não há segunda tentativa — seria pedir o mesmo duas vezes', async () => {
		const r = await carregar('hoquei.pages.dev', { [CAMINHO]: null });
		expect(r.pedidos).toEqual([CAMINHO]);
		expect(r.erro).toBeInstanceOf(Error);
	});
});
