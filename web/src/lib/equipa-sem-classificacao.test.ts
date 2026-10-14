import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { classificacaoDaEquipa, tabelasDe } from './classificacao';

/**
 * **Nenhuma equipa pode perder a sua classificação sem que isto falhe.**
 *
 * ## Porque é que este teste existe
 *
 * A 10/10/2026 o Mérito entrou e a tabela de pontos dos Escolares e dos Benjamins deixou de ser
 * calculada — bem, porque ali a classificação é o Mérito. O ecrã da competição passou a mostrar
 * o Mérito; o da equipa ficou a decidir só pela tabela de pontos, e dizia *"Esta equipa não tem
 * classificação publicada"*. Quatro dias no ar, e quem deu por isso foi o dono, no telemóvel.
 *
 * A suite tinha 672 testes e **nenhum deles podia apanhar isto**, porque nenhum monta um
 * componente: entre "os dados estão certos" — e estavam — e "o ecrã mostra alguma coisa" não
 * havia camada nenhuma. O dono já me tinha dito, dias antes, que era importante pôr testes para
 * não se perder nada. Este é o teste que faltava, e a lição que ele guarda é mais larga do que o
 * Mérito: **a decisão de "o que é que este ecrã mostra" tem de ser testável sem montar o ecrã.**
 * Por isso ela vive no `classificacaoDaEquipa`, e não dentro do `.svelte`.
 *
 * Corre contra os **dados verdadeiros** publicados em `web/static/v1`, equipa a equipa. Zero
 * pedidos à APL.
 */
describe('a classificação de cada equipa', () => {
	const raiz = new URL('../../static/v1/aplisboa/', import.meta.url);
	const temporadas = existsSync(raiz) ? readdirSync(raiz).sort().reverse() : [];
	const base = temporadas.length ? new URL(`${temporadas[0]}/`, raiz) : null;

	const ler = <T>(caminho: string): T | null => {
		const f = new URL(caminho, base!);
		return existsSync(f) ? (JSON.parse(readFileSync(f, 'utf-8')) as T) : null;
	};

	type Equipa = { equipa: string; categoria: string; competicoes: number[] };
	const equipas = base ? (ler<{ equipas: Equipa[] }>('teams.json')?.equipas ?? []) : [];

	/** As provas de uma equipa, com a forma que o `+page.ts` do ecrã monta. */
	const provasDe = (e: Equipa) =>
		e.competicoes.map((id) => {
			const comp = ler<Parameters<typeof tabelasDe>[0]>(`comp/${id}.json`);
			return {
				merito: ler<{ linhas: { equipa: string }[] }>(`merito/${id}.json`),
				classificacao: tabelasDe(comp).grupos
			};
		});

	it('há equipas que cheguem para isto significar alguma coisa', () => {
		// Guarda contra o teste passar por não ter encontrado nada que verificar — a mesma
		// armadilha que já apanhou outros testes deste projecto.
		expect(equipas.length).toBeGreaterThanOrEqual(100);
	});

	/**
	 * Os dois escalões onde a classificação **tem** de existir sempre que há jogos com boletim:
	 * é o Mérito, calculado por nós a partir dos boletins, e não depende de a fonte publicar
	 * tabela nenhuma. Foi exactamente aqui que se perdeu.
	 */
	it.each(['ESCOLARES', 'BENJAMINS'])(
		'nos %s, nenhuma equipa fica sem classificação',
		(categoria) => {
			const doEscalao = equipas.filter((e) => e.categoria === categoria);
			expect(doEscalao.length).toBeGreaterThan(5);
			const sem = doEscalao
				.filter((e) => classificacaoDaEquipa(provasDe(e), e.equipa) === 'nenhuma')
				.map((e) => e.equipa);
			expect(sem).toEqual([]);
		}
	);

	it('nos Escolares e Benjamins a classificação é o Mérito, e não uma tabela de pontos', () => {
		// Se um dia voltarmos a calcular pontos nestes escalões, são duas classificações para a
		// mesma prova — duas verdades. O regulamento manda o Mérito; é o Mérito que aparece.
		const quais = new Set(
			equipas
				.filter((e) => e.categoria === 'ESCOLARES' || e.categoria === 'BENJAMINS')
				.map((e) => classificacaoDaEquipa(provasDe(e), e.equipa))
		);
		expect([...quais]).toEqual(['merito']);
	});

	it('toda a equipa que a fonte lista numa tabela vê essa tabela', () => {
		// A outra metade, e a que apanha o caminho dos pontos a partir-se: se a fonte publica uma
		// tabela e a equipa está lá dentro, o ecrã dela não pode dizer que não há classificação.
		const falhas: string[] = [];
		for (const e of equipas) {
			const provas = provasDe(e);
			const naTabela = provas.some((p) =>
				p.classificacao.some((g) => g.linhas.some((l) => l.equipa === e.equipa))
			);
			if (naTabela && classificacaoDaEquipa(provas, e.equipa) === 'nenhuma') {
				falhas.push(`${e.categoria} / ${e.equipa}`);
			}
		}
		expect(falhas).toEqual([]);
	});

	/**
	 * E as que **podem** ficar sem classificação, que é informação e não defeito.
	 *
	 * Medido a 14/10/2026: 44 entradas equipa+escalão com jogos disputados e sem classificação
	 * nenhuma. Fui ver uma a uma de onde vêm, porque um número destes sem explicação é um teste
	 * que ninguém acredita:
	 *
	 * * **39 são Torneios Particulares** — jogos-treino. Uma tabela ali não quer dizer nada, e
	 *   ficou de fora por decisão tomada a 07/10/2026.
	 * * **As outras são equipas que só jogam eliminatórias**: a Supertaça, e as finais dos
	 *   Torneios de Abertura. A APL inscreve esses jogos com o nome do clube **sem sufixo** —
	 *   `SPORTING CP`, e não `SPORTING CP A` —, enquanto a tabela da fase de grupos usa os nomes
	 *   com sufixo. Verificado no Torneio Abertura Sub-17: toda a equipa da tabela joga, e as
	 *   duas que jogam sem estar na tabela são `AE FISICA` e `SL BENFICA`, as duas sem sufixo.
	 *   É a estrutura da fonte, não uma grafia errada nossa.
	 *
	 * O teste não fixa o número — equipas entram e saem. Fixa a **razão**: fora dos Torneios
	 * Particulares, uma equipa sem classificação não pode ter jogos numa prova onde ela própria
	 * apareça na tabela. Essa é a condição que distingue "a fonte não a lista" de "nós
	 * perdemo-la", e é a segunda que tem de falhar aqui.
	 */
	it('as equipas sem classificação são as dos torneios e das eliminatórias', () => {
		const sem = equipas.filter((e) => classificacaoDaEquipa(provasDe(e), e.equipa) === 'nenhuma');
		const inesperadas = sem.filter((e) => e.categoria !== 'TORNEIOS PARTICULARES');
		// Não é zero, e não devia ser: são as que só jogam eliminatórias. O que se exige é que
		// nenhuma delas seja de um escalão onde a classificação é obrigatória.
		expect(inesperadas.map((e) => e.categoria)).not.toContain('ESCOLARES');
		expect(inesperadas.map((e) => e.categoria)).not.toContain('BENJAMINS');
		for (const e of inesperadas) {
			const temTabelaOndeJoga = provasDe(e).some((p) =>
				p.classificacao.some((g) => g.linhas.some((l) => l.equipa === e.equipa))
			);
			expect(temTabelaOndeJoga, `${e.categoria} / ${e.equipa}`).toBe(false);
		}
	});
});
