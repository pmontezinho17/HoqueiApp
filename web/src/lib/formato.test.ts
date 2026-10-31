import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { diaDeLisboa } from './dia';
import { faseCurta, jornadaAtual, nomeProprio, nomeProva, situacaoADecorrer } from './formato';
import { disputado, type Jogo } from './tipos';

describe('nomeProprio', () => {
	it('põe em caixa de título o que a fonte publica em maiúsculas', () => {
		expect(nomeProprio('SALVADOR MONTEZINHO')).toBe('Salvador Montezinho');
	});

	it('mantém os acentos que a fonte já traz', () => {
		expect(nomeProprio('JOÃO GONÇALVES')).toBe('João Gonçalves');
	});

	it('deixa as partículas em minúscula', () => {
		expect(nomeProprio('VASCO DE SOUSA')).toBe('Vasco de Sousa');
		expect(nomeProprio('MARIA DOS SANTOS E SILVA')).toBe('Maria dos Santos e Silva');
	});

	it('não baixa uma partícula que abra o nome', () => {
		expect(nomeProprio('DA SILVA JUNIOR')).toBe('Da Silva Junior');
	});

	it('recupera a maiúscula depois de hífen e de apóstrofo', () => {
		expect(nomeProprio("D'ÁVILA")).toBe("D'Ávila");
		expect(nomeProprio('ANA VILA-CHÃ')).toBe('Ana Vila-Chã');
	});

	it('não mexe num nome que já venha escrito com critério', () => {
		expect(nomeProprio('Salvador MonteZinho')).toBe('Salvador MonteZinho');
		expect(nomeProprio('Vasco de Sousa')).toBe('Vasco de Sousa');
	});

	it('aguenta vazio e nulo', () => {
		expect(nomeProprio(null)).toBe('');
		expect(nomeProprio('')).toBe('');
	});

	it('preserva o espaçamento interior', () => {
		expect(nomeProprio('ANA  SILVA')).toBe('Ana  Silva');
	});
});

describe('faseCurta', () => {
	it('encurta a parte para caber na coluna da linha de jogo', () => {
		expect(faseCurta({ periodo: '2ª Parte' })).toBe('2ª p');
		expect(faseCurta({ periodo: '4ª Parte' })).toBe('4ª p');
	});

	it('aceita o "a" que a fonte às vezes manda em vez do ordinal', () => {
		expect(faseCurta({ periodo: '1a Parte' })).toBe('1ª p');
	});

	it('abrevia o intervalo, que é quando não há relógio para mostrar', () => {
		expect(faseCurta({ periodo: 'Intervalo' })).toBe('Interv.');
	});

	it('cai para a situação quando o período não foi separado', () => {
		expect(faseCurta({ periodo: null, situacao: '1ª Parte (13:26)' })).toBe('1ª p');
	});

	it('prefere o período à situação quando há os dois', () => {
		expect(faseCurta({ periodo: '3ª Parte', situacao: 'Intervalo' })).toBe('3ª p');
	});

	it('devolve null sem dados, para a linha voltar a dizer AO VIVO', () => {
		expect(faseCurta({})).toBeNull();
		expect(faseCurta({ periodo: null, situacao: null })).toBeNull();
		expect(faseCurta({ periodo: '   ' })).toBeNull();
	});

	it('não deixa passar um texto longo desconhecido, que partia a coluna em três linhas', () => {
		expect(faseCurta({ situacao: 'Jogo interrompido por falta de luz' })).toBeNull();
		expect(faseCurta({ situacao: 'Suspenso' })).toBe('Suspenso');
	});
});

describe('nomeProva', () => {
	it('tira as maiúsculas que a fonte publica', () => {
		expect(nomeProva('CAMP. REG. SUB-15 - 1ª FASE')).toBe('Camp. Reg. Sub-15 - 1ª Fase');
	});

	it('não transforma algarismos romanos em palavras', () => {
		// `nomeProprio` sozinho devolvia "Nivel Ii", que é o tipo de erro que se nota logo
		expect(nomeProva('ENCONTROS DISTRITAIS ESCOLARES - 1ª FASE NIVEL II')).toBe(
			'Encontros Distritais Escolares - 1ª Fase NIVEL II'.replace('NIVEL', 'Nivel')
		);
		expect(nomeProva('FASE III')).toBe('Fase III');
		expect(nomeProva('GRUPO IV')).toBe('Grupo IV');
	});

	it('deixa em pé a letra solta de uma série', () => {
		expect(nomeProva('CAMP. REG. SUB-13 - 1ª FASE - SERIE D')).toBe(
			'Camp. Reg. Sub-13 - 1ª Fase - Serie D'
		);
	});

	it('baixa as partículas, como nos nomes de pessoas', () => {
		expect(nomeProva('TAÇA PROF. JOAO CAMPELO - SENIORES FEMININOS')).toBe(
			'Taça Prof. Joao Campelo - Seniores Femininos'
		);
	});

	it('aguenta vazio e nulo', () => {
		expect(nomeProva(null)).toBe('');
		expect(nomeProva('')).toBe('');
	});
});

describe('jornadaAtual', () => {
	const jogo = (jornada: string, data: string, golos: [number, number] | null): Jogo =>
		({ jornada, data, golos_casa: golos?.[0] ?? null, golos_fora: golos?.[1] ?? null }) as Jogo;

	// a 7ª e a 8ª dos sub-13 a 31/10/2026, ao fim da tarde de sábado
	const sabado = [
		jogo('7ª JORNADA', '2026-10-31', [8, 1]),
		jogo('7ª JORNADA', '2026-10-31', [2, 3]),
		jogo('7ª JORNADA', '2026-10-31', [0, 3]),
		jogo('8ª JORNADA', '2026-11-07', null),
		jogo('8ª JORNADA', '2026-11-07', null)
	];

	it('a jornada seguinte a uma acabada diz "próxima" até chegar o dia', () => {
		expect(jornadaAtual(sabado, '2026-10-31')).toEqual({ jornada: '8ª JORNADA', rotulo: 'próxima' });
		expect(jornadaAtual(sabado, '2026-11-06')).toEqual({ jornada: '8ª JORNADA', rotulo: 'próxima' });
	});

	it('no dia do primeiro jogo passa a "em curso", ainda sem resultados', () => {
		expect(jornadaAtual(sabado, '2026-11-07')).toEqual({ jornada: '8ª JORNADA', rotulo: 'em curso' });
	});

	it('uma jornada com um jogo já disputado está em curso, mesmo antes da data dos outros', () => {
		const jogos = [
			jogo('7ª JORNADA', '2026-10-31', [8, 1]),
			jogo('7ª JORNADA', '2026-11-14', null),
			jogo('8ª JORNADA', '2026-11-07', null)
		];
		expect(jornadaAtual(jogos, '2026-11-01')).toEqual({ jornada: '7ª JORNADA', rotulo: 'em curso' });
	});

	it('o dia de hoje é o de Lisboa, não o do telemóvel', () => {
		// 23:30 de sexta em Bogotá (UTC−5) já é sábado, 04:30, em Lisboa
		const quando = new Date('2026-11-07T04:30:00Z');
		expect(jornadaAtual(sabado, diaDeLisboa(quando))?.rotulo).toBe('em curso');
	});

	it('uma prova sem jogos não tem jornada', () => {
		expect(jornadaAtual([], '2026-10-31')).toBeNull();
	});

	// Os dados publicados, prova a prova: o rótulo tem de concordar com os resultados e as
	// datas que lá estão. Não fixa números — as provas mudam a cada ronda —, fixa a razão.
	const raiz = new URL('../../static/v1/aplisboa/', import.meta.url);
	const temporadas = existsSync(raiz) ? readdirSync(raiz).sort().reverse() : [];
	const pasta = new URL(`${temporadas[0]}/comp/`, raiz);
	const provas = existsSync(pasta) ? readdirSync(pasta).filter((f) => f.endsWith('.json')) : [];
	const hoje = diaDeLisboa();

	it('há provas publicadas para verificar', () => {
		expect(provas.length).toBeGreaterThan(10);
	});

	it.each(provas)('em %s, "próxima" só numa jornada sem resultados e por chegar', (f) => {
		const jogos: Jogo[] = JSON.parse(readFileSync(new URL(f, pasta), 'utf-8')).jogos ?? [];
		const atual = jornadaAtual(jogos, hoje);
		if (!atual) return;
		const daJornada = jogos.filter((j) => j.jornada === atual.jornada);
		const comecou = daJornada.some((j) => disputado(j) || (!!j.data && j.data <= hoje));
		expect(comecou).toBe(atual.rotulo === 'em curso');
	});
});

describe('situacaoADecorrer', () => {
	it('um jogo terminado e suspendido não está a decorrer', () => {
		// o texto da APL a 31/10/2026, num sub-15 acabado 6–1
		expect(situacaoADecorrer('Jogo Terminado (Jogo Suspendido)')).toBe(false);
	});

	it('os estados fechados e por começar não estão a decorrer', () => {
		for (const s of ['Jogo Terminado', 'Jogo Suspendido', 'Jogo Adiado', 'Jogo sem começar', null])
			expect(situacaoADecorrer(s)).toBe(false);
	});

	it('o intervalo e as partes estão a decorrer', () => {
		for (const s of ['Intervalo', '2ª Parte (13:26)', 'Prolongamento'])
			expect(situacaoADecorrer(s)).toBe(true);
	});
});
