import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Um aviso que abre tem de poder fechar — em qualquer dia, não só no dia em que nasceu.
 *
 * ## O defeito, medido
 *
 * A issue #21 nasceu a 11/10/2026 às 22:48 ("ao vivo preso" em seis jogos) e ainda estava
 * aberta a 13/10 à noite. A cadeia estava **verde**: o estado na D1 dizia `ao_vivo_preso: []`,
 * e os seis jogos tinham resultado e nenhum marcado ao vivo. O fecho do `aviso.yml` procurava
 * a issue cujo título fosse `Cadeia em vermelho — <hoje>`, e o título leva a data do dia em
 * que o aviso nasceu. **Um vermelho às 22:48 que recupere depois da meia-noite não tem como
 * ser encontrado.**
 *
 * No mesmo dia encontrou-se o irmão: o aviso da fonte, no `dados.yml`, abria um por dia e
 * **não tinha fecho nenhum** — duas issues abertas, #23 e #25, a nascer uma por dia enquanto
 * a APL não corrigisse a tabela dela.
 *
 * ## Porque é que isto é um teste de texto
 *
 * Não há forma de correr um workflow da GitHub num `vitest`. O que se pode fazer, e chega para
 * este defeito, é recusar a forma que o causou: **um `gh issue close` cuja lista de candidatas
 * seja filtrada pelo título**. Filtrar por etiqueta é o certo; por título é o que prende o
 * fecho ao dia.
 *
 * Varre os workflows todos e não uma lista escrita aqui, porque uma lista copiada para um
 * teste tem exactamente o problema que o teste tenta resolver — é a mesma razão do teste da
 * política de privacidade.
 */
describe('os avisos sabem fechar-se', () => {
	const dir = new URL('../../../.github/workflows/', import.meta.url);
	const ficheiros = readdirSync(dir)
		.filter((n) => n.endsWith('.yml'))
		.map((n) => ({ nome: n, texto: readFileSync(new URL(n, dir), 'utf-8') }));

	it('há workflows para ler', () => {
		// Guarda contra este teste passar por não ter encontrado nada que verificar.
		expect(ficheiros.length).toBeGreaterThanOrEqual(8);
	});

	/**
	 * **Um aviso não é qualquer issue.** O que o distingue é reutilizar a mesma: procura uma
	 * aberta e comenta, em vez de abrir a segunda. É essa procura — o `gh issue list` — que o
	 * identifica aqui.
	 *
	 * A diferença não é académica: o `sugestoes.yml` abre **uma issue por sugestão**, num
	 * repositório privado, e é um arquivo e não um alarme. Fechá-la é uma decisão de quem lê,
	 * não do workflow. A primeira versão desta regra dizia "todo o workflow que abre uma issue
	 * também a fecha" e reprovou-o — correctamente, para a letra da regra, e erradamente para o
	 * que ela quer dizer. Escrevi-a num ramo onde o `sugestoes.yml` ainda não existia, e só
	 * apareceu ao fundir no `testes`.
	 */
	const queAvisam = ficheiros.filter(
		(f) => f.texto.includes('gh issue create') && f.texto.includes('gh issue list')
	);

	it('todo o workflow que reutiliza uma issue de aviso também a fecha', () => {
		const semFecho = queAvisam
			.filter((f) => !f.texto.includes('gh issue close'))
			.map((f) => f.nome);
		expect(semFecho).toEqual([]);
	});

	it('e há avisos que chegue para a regra significar alguma coisa', () => {
		expect(queAvisam.length).toBeGreaterThanOrEqual(3);
	});

	/**
	 * Um título com data só pode servir para **abrir**.
	 *
	 * Esta é a regra que o defeito violava, e aqui ela é verificável: a selecção que alimenta
	 * um fecho não pode comparar títulos quando o título do workflow carrega uma data. Os
	 * fechos que comparam um título **constante** — o da ronda, no `dados.yml`, e o da vigia,
	 * no `saude.yml` — estão certos e ficam como estão; o que os salva é o título não mudar
	 * de um dia para o outro.
	 */
	const comTituloDatado = ficheiros.filter((f) =>
		/titulo="[^"\n]*(\$\(TZ=Europe\/Lisbon date \+%F\)|\$DIA)/.test(f.texto)
	);

	it('há títulos com data, senão esta regra não verifica nada', () => {
		expect(comTituloDatado.map((f) => f.nome).sort()).toEqual(['aviso.yml', 'dados.yml']);
	});

	it('o aviso da cadeia fecha todas as abertas da etiqueta, de qualquer dia', () => {
		const aviso = ficheiros.find((f) => f.nome === 'aviso.yml')!.texto;
		// A lista que alimenta o fecho devolve **só** números, de todas as abertas: um
		// `--json number,title` com `select(.title == "$titulo")` é exactamente o defeito.
		expect(aviso).toMatch(
			/fechar=\$\(gh issue list --state open --label "\$etiqueta" --limit 50 \\\n\s*--json number --jq '\.\[\]\.number'\)/
		);
		// `[;\s]` no fim: sem isso, um `$fechar_qualquer_coisa` passava como prefixo.
		expect(aviso).toMatch(/for n in \$fechar[;\s]/);
	});

	it('o aviso da fonte tem um passo que o fecha, e fecha todas', () => {
		const dados = ficheiros.find((f) => f.nome === 'dados.yml')!.texto;
		expect(dados).toContain('A fonte voltou a bater certo');
		expect(dados).toMatch(
			/--label fonte --limit 50 --json number \\\n\s*--jq '\.\[\]\.number'/
		);
	});
});
