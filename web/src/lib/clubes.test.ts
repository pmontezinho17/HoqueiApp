import { describe, expect, it } from 'vitest';
import {
	agruparClubes,
	competicoesVivas,
	etiquetasDoEscalao,
	familiaDaProva,
	nomeDoClube,
	seguidasNoClube
} from './clubes';
import type { EquipaIndice } from './tipos';

const eq = (equipa: string, categoria: string, competicoes: number[] = [1]): EquipaIndice =>
	({ equipa, categoria, competicoes }) as EquipaIndice;

describe('o nome de um clube sai dos nomes das suas equipas', () => {
	it('é o mais curto, porque os outros são ele mais uma letra', () => {
		expect(nomeDoClube(['A STUART HCM A', 'A STUART HCM', 'A STUART HCM B'])).toBe('A STUART HCM');
	});

	it('empate de comprimento resolve-se pelo mais usado — e isso separa a grafia da gralha', () => {
		// medido a 06/10: AD OEIRAS aparece em 16 jogos, AD OERIAS em 1, e têm 9 letras os dois
		const nomes = ['AD OERIAS', 'AD OEIRAS', 'AD OEIRAS A'];
		expect(nomeDoClube(nomes, { 'AD OEIRAS': 16, 'AD OERIAS': 1 })).toBe('AD OEIRAS');
	});

	it('não corta letras a sério: o corte ingénuo de sufixos dava PAREDE F', () => {
		expect(nomeDoClube(['PAREDE FC', 'PAREDE FC A', 'PAREDE FC B'])).toBe('PAREDE FC');
		expect(nomeDoClube(['CD MAFRA', 'CD MAFRA A'])).toBe('CD MAFRA');
	});

	it('tira a marca de escalão que a fonte mete dentro do nome', () => {
		expect(nomeDoClube(['AA COIMBRA (S15)'])).toBe('AA COIMBRA');
	});

	it('corrige à mão os dois que a regra não acerta', () => {
		// a fonte trunca: "S ALENQUER B" é o Benfica de Alenquer, não a equipa B
		expect(nomeDoClube(['S ALENQUER B', 'S ALENQUER BENFICA'])).toBe('S ALENQUER BENFICA');
		expect(nomeDoClube(['HC MEALHADA (S17)', 'HC MEALHADA (S23)'])).toBe('HC MEALHADA');
	});
});

describe('agrupar por emblema e não por nome', () => {
	const emblemas = {
		'AD OEIRAS': '/e/6.webp',
		'AD OEIRAS A': '/e/6.webp',
		'AD OERIAS': '/e/6.webp',
		'SC TORRES': '/e/25.webp'
	};

	it('junta as variantes de letra e a gralha no mesmo clube', () => {
		const c = agruparClubes(
			[eq('AD OEIRAS', 'SUB-13'), eq('AD OEIRAS A', 'SUB-15'), eq('AD OERIAS', 'SUB-17')],
			emblemas,
			{ 'AD OEIRAS': 16, 'AD OERIAS': 1 }
		);
		expect(c).toHaveLength(1);
		expect(c[0].nome).toBe('AD OEIRAS');
		expect(c[0].equipas).toHaveLength(3);
	});

	it('ordena por ordem alfabética, que é como se procura um clube numa grelha', () => {
		const c = agruparClubes(
			[eq('SC TORRES', 'SUB-13'), eq('AD OEIRAS A', 'SUB-15'), eq('AD OEIRAS', 'SUB-13')],
			emblemas
		);
		expect(c.map((x) => x.nome)).toEqual(['AD OEIRAS', 'SC TORRES']);
	});

	it('uma equipa sem emblema não entra: não há clube a que pertencer', () => {
		expect(agruparClubes([eq('EQUIPA FANTASMA', 'SUB-13')], emblemas)).toEqual([]);
	});
});

describe('a etiqueta de cada equipa no escalão', () => {
	const e = (equipa: string, categoria: string) => ({ equipa, categoria, competicoes: [] });

	it('só o escalão quando o clube tem uma equipa nesse escalão', () => {
		const m = etiquetasDoEscalao([e('SC TORRES', 'SUB-13')]);
		expect(m.get('SC TORRES')).toBe('SUB-13');
	});

	it('o que distingue é o que sobra do prefixo comum, não o nome do clube', () => {
		// Com o filtro das competições vivas o AE FISICA tem "D A" e "D B" nos sub-13. O "D"
		// está nos dois, logo não distingue: descontar só o nome do clube dava "SUB-13 D A".
		const m = etiquetasDoEscalao([e('AE FISICA D A', 'SUB-13'), e('AE FISICA D B', 'SUB-13')]);
		expect([...m.values()]).toEqual(['SUB-13 A', 'SUB-13 B']);
	});

	it('a equipa sem letra fica com o escalão nu, a outra leva a dela', () => {
		const m = etiquetasDoEscalao([e('SC TORRES', 'SUB-17'), e('SC TORRES B', 'SUB-17')]);
		expect(m.get('SC TORRES')).toBe('SUB-17');
		expect(m.get('SC TORRES B')).toBe('SUB-17 B');
	});

	it('o prefixo comum corta na fronteira de palavra: não dá PAREDE F', () => {
		const m = etiquetasDoEscalao([e('PAREDE FC A', 'SUB-13'), e('PAREDE FC B', 'SUB-13')]);
		expect([...m.values()]).toEqual(['SUB-13 A', 'SUB-13 B']);
	});
});

/**
 * O filtro que o Pedro propôs a 06/10/2026, e que se confirmou nos dados: um clube
 * inscreve-se nos torneios de abertura com um nome e nos campeonatos com outro, e são os
 * torneios já terminados que enchem a escolha de linhas inúteis.
 */
describe('competições que ainda têm jogos por jogar', () => {
	it('uma competição com todos os jogos jogados está terminada', () => {
		const v = competicoesVivas([
			{ comp: 1, gc: 2 },
			{ comp: 1, gc: 0 }
		]);
		expect(v.has(1)).toBe(false);
	});

	it('basta um jogo sem resultado para a competição contar como viva', () => {
		const v = competicoesVivas([
			{ comp: 1, gc: 2 },
			{ comp: 1, gc: null }
		]);
		expect(v.has(1)).toBe(true);
	});

	it('uma competição que ainda não começou está viva', () => {
		const v = competicoesVivas([{ comp: 9, gc: null }]);
		expect(v.has(9)).toBe(true);
	});

	it('separa competições diferentes', () => {
		const v = competicoesVivas([
			{ comp: 1, gc: 1 },
			{ comp: 2, gc: null }
		]);
		expect([...v]).toEqual([2]);
	});
});

describe('quantas equipas de um clube a pessoa segue', () => {
	const clube = {
		emblema: '/e/3.webp',
		nome: 'PAREDE FC',
		equipas: [
			{ equipa: 'PAREDE FC A', categoria: 'SUB-13', competicoes: [] },
			{ equipa: 'PAREDE FC B', categoria: 'SUB-13', competicoes: [] }
		]
	};

	it('zero, para o emblema ficar sem estrela', () => {
		expect(seguidasNoClube(clube, [])).toBe(0);
	});

	it('conta só as que são deste clube e deste escalão', () => {
		const favs = [
			{ equipa: 'PAREDE FC A', categoria: 'SUB-13', competicoes: [] },
			{ equipa: 'SC TORRES', categoria: 'SUB-13', competicoes: [] }
		];
		expect(seguidasNoClube(clube, favs)).toBe(1);
	});
});


/**
 * A família de uma prova é o que responde a "isto é o campeonato ou um torneio de
 * pré-época?" — a pergunta que se faz ao escolher quem seguir. Os nomes abaixo são os
 * reais desta época.
 */
describe('a família de uma prova', () => {
	it('classifica as seis famílias desta época', () => {
		expect(familiaDaProva('CAMP. REG. SUB-13 - 1ª FASE - SERIE A')).toBe('Campeonato Regional');
		expect(familiaDaProva('ENCONTROS DISTRITAIS BENJAMINS - 1ª FASE NIVEL I - SERIE A'))
			.toBe('Encontros Distritais');
		expect(familiaDaProva('SUPERTAÇA APL SUB-17')).toBe('Supertaça');
		expect(familiaDaProva('TAÇA JESUS CORREIA - SENIORES MASCULINOS')).toBe('Taça');
		expect(familiaDaProva('TORNEIO ABERTURA APL SUB-13')).toBe('Torneio de Abertura');
		expect(familiaDaProva('JOGO TREINO')).toBe('Jogos-treino');
	});

	it('a Supertaça não se confunde com a Taça: a ordem dos padrões importa', () => {
		expect(familiaDaProva('SUPERTAÇA APL SUB-13')).not.toBe('Taça');
	});

	it('um torneio de nome próprio mostra-se como vem', () => {
		expect(familiaDaProva('ZECA PINTO')).toBe('ZECA PINTO');
	});

	it('corta a série de um nome desconhecido em vez de a repetir', () => {
		expect(familiaDaProva('PROVA NOVA - SERIE A')).toBe('PROVA NOVA');
	});
});
