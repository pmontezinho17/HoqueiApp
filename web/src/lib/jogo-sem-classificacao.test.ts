import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { classificacaoDoJogo } from './classificacao';
import type { FicheiroMerito, GrupoClassificacao } from './tipos';

/**
 * **Nenhuma prova pode abrir uma ficha de jogo sem classificação que já tenha uma publicada.**
 *
 * ## Porque é que este teste existe
 *
 * É a terceira vez que a mesma coisa acontece. A 10/10/2026 o Mérito do Artigo 92.º substituiu
 * a tabela de pontos nos Escolares e nos Benjamins. O ecrã da **competição** passou a mostrá-lo
 * no mesmo dia. O ecrã da **equipa** ficou quatro dias a dizer que não havia classificação, e
 * quem o apanhou foi o dono, no telemóvel — daí o `equipa-sem-classificacao.test.ts` ao lado.
 *
 * A **ficha de jogo** ficou de fora mais onze dias, e também foi o dono que a apanhou: *"no meu
 * dos jogos, quando entro num jogo de Benjamins ou Escolares, quero ver a tabela de mérito"*.
 * Ali era ainda mais invisível, porque a página nem pedia o ficheiro do Mérito: não havia
 * decisão errada, havia um separador que não existia.
 *
 * O `AGENTS.md` já dizia, desde 14/10, que **verificar o ecrã que se mexeu não chega — a avaria
 * aparece no outro**. Dizia-o em palavras, e as palavras não apanharam o terceiro ecrã. Este
 * teste apanha, e apanha o quarto se houver.
 *
 * Corre contra os dados **verdadeiros** publicados em `web/static/v1`, prova a prova.
 */
describe('a classificação de cada prova, na ficha de jogo', () => {
	const raiz = new URL('../../static/v1/aplisboa/', import.meta.url);
	const temporadas = existsSync(raiz) ? readdirSync(raiz).sort().reverse() : [];
	const base = temporadas.length ? new URL(`${temporadas[0]}/`, raiz) : null;

	const ler = <T>(caminho: string): T | null => {
		if (!base) return null;
		const f = new URL(caminho, base);
		return existsSync(f) ? (JSON.parse(readFileSync(f, 'utf-8')) as T) : null;
	};

	type Comp = {
		competicao?: { nome?: string; categoria?: string };
		classificacao?: GrupoClassificacao[];
		classificacao_calculada?: GrupoClassificacao[];
	};

	const provas = (() => {
		if (!base) return [];
		const pasta = new URL('comp/', base);
		if (!existsSync(pasta)) return [];
		return readdirSync(pasta)
			.filter((f) => f.endsWith('.json'))
			.map((f) => {
				const id = f.replace('.json', '');
				const comp = ler<Comp>(`comp/${f}`);
				return {
					id,
					nome: comp?.competicao?.nome ?? '?',
					categoria: (comp?.competicao?.categoria ?? '').toUpperCase(),
					comp,
					merito: ler<FicheiroMerito>(`merito/${id}.json`)
				};
			});
	})();

	it('há provas publicadas, senão não se está a verificar nada', () => {
		expect(provas.length).toBeGreaterThan(0);
	});

	it('uma prova com Mérito publicado mostra o Mérito', () => {
		const falham = provas
			.filter((p) => p.merito?.linhas?.length)
			.filter((p) => classificacaoDoJogo(p.comp, p.merito) !== 'merito')
			.map((p) => p.nome);
		expect(falham).toEqual([]);
	});

	it('nos Escolares e nos Benjamins é sempre o Mérito — é ali que a classificação é essa', () => {
		const desses = provas.filter(
			(p) => p.categoria === 'ESCOLARES' || p.categoria === 'BENJAMINS'
		);
		// se um dia não houver nenhuma, isto falha e manda confirmar os dados em vez de passar
		// em silêncio sobre um conjunto vazio
		expect(desses.length).toBeGreaterThan(0);
		expect(desses.filter((p) => classificacaoDoJogo(p.comp, p.merito) !== 'merito').map((p) => p.nome))
			.toEqual([]);
	});

	it('e o defeito reproduz-se: sem o ficheiro do Mérito, estas provas ficavam sem nada', () => {
		// Era exactamente isto que a ficha de jogo fazia até 21/10/2026 — não pedia o
		// `/merito/<id>.json`, por isso decidia com `null` no lugar dele. Este caso existe para
		// que o teste acima não seja uma asserção sobre código que nunca pôde falhar.
		const desses = provas.filter(
			(p) => p.categoria === 'ESCOLARES' || p.categoria === 'BENJAMINS'
		);
		expect(desses.every((p) => classificacaoDoJogo(p.comp, null) === 'nenhuma')).toBe(true);
	});

	it('uma prova com tabela de pontos publicada mostra a tabela', () => {
		const comPontos = provas.filter(
			(p) =>
				!p.merito?.linhas?.length &&
				[...(p.comp?.classificacao ?? []), ...(p.comp?.classificacao_calculada ?? [])].some(
					(g) => g.linhas.length > 0
				)
		);
		expect(comPontos.length).toBeGreaterThan(0);
		expect(comPontos.filter((p) => classificacaoDoJogo(p.comp, p.merito) !== 'pontos').map((p) => p.nome))
			.toEqual([]);
	});

	it('só fica sem classificação quem não tem nenhuma publicada — e isso é a fonte, não nós', () => {
		// As que caem aqui são eliminatórias e jogos-treino, onde uma classificação não quer
		// dizer nada: ver `vale_calcular` no raspador. O teste não fixa quantas são — isso muda
		// de semana para semana — mas exige que **nenhuma** delas tenha dados por mostrar.
		const semNada = provas.filter((p) => classificacaoDoJogo(p.comp, p.merito) === 'nenhuma');
		const mentirosas = semNada.filter(
			(p) =>
				p.merito?.linhas?.length ||
				[...(p.comp?.classificacao ?? []), ...(p.comp?.classificacao_calculada ?? [])].some(
					(g) => g.linhas.length > 0
				)
		);
		expect(mentirosas.map((p) => p.nome)).toEqual([]);
	});
});
