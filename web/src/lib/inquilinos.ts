/**
 * As fontes de dados da app — "inquilinos" da plataforma — e quem é dono de cada número.
 *
 * Até 17/11/2026 havia uma só, a Associação de Patinagem de Lisboa. A FPP entra com o Placard,
 * a 2.ª e a 3.ª divisão (`docs/11-ligas-nacionais.md`), publicada numa árvore à parte com a
 * mesma forma: `/v1/fpp/2026-27/…`. As duas correm o mesmo programa com bases separadas, e
 * **cada uma numera as suas competições e os seus jogos**.
 *
 * Os números ficam como a fonte os dá, e o que diz de quem é cada um é este registo, cheio
 * pelo layout a partir dos índices das duas. Foi escolhido em vez de mudar os ids para texto
 * (`"fpp:348"`) porque esses números atravessam a app inteira — mapas, favoritos guardados no
 * telemóvel, a ligação de uma linha da agenda à sua prova — e uma conversão esquecida num só
 * sítio dava um ecrã vazio sem erro nenhum. **O preço é que os números não se podem repetir
 * entre fontes**, e há um teste que o verifica nos dados publicados
 * (`inquilinos.test.ts`). Medido a 17/11/2026: as competições da APL vão de 431 a 467 e as da
 * FPP de 346 a 363; os jogos da APL de ~9 330 a ~10 010 e os da FPP de ~18 260 a ~19 600. As
 * duas séries crescem todas as épocas e a da FPP cresce mais depressa nos jogos e mais devagar
 * nas competições, por isso não se cruzam — e se um dia se cruzarem, o teste falha antes de a
 * app se enganar.
 *
 * **A APL fica sem prefixo em todo o lado**, porque os caminhos dela são públicos desde 30/09 e
 * estão em cache nos telemóveis: `/jogo/9644` continua a ser o mesmo jogo. A FPP ganha o nome à
 * frente nos endereços — `/jogo/fpp-18262` — para um link partilhado dizer de onde vem mesmo
 * antes de o registo estar cheio.
 */

export type Inquilino = 'aplisboa' | 'fpp';

export const ORIGINAL: Inquilino = 'aplisboa';

/** As raízes publicadas. A época é a mesma nas duas, e muda nas duas ao mesmo tempo. */
export const CAMINHOS: Record<Inquilino, string> = {
	aplisboa: '/v1/aplisboa/2026-27',
	fpp: '/v1/fpp/2026-27'
};

/** Para as frases que dizem de onde vêm os dados. */
export const NOMES: Record<Inquilino, string> = {
	aplisboa: 'Associação de Patinagem de Lisboa',
	fpp: 'Federação de Patinagem de Portugal'
};

const competicoes = new Map<number, Inquilino>();
const jogos = new Map<number, Inquilino>();

/** Regista quem é dono destes números. Chamado pelo layout a cada carregamento dos índices. */
export function registar(inq: Inquilino, ids: { competicoes: Iterable<number>; jogos: Iterable<number | null> }) {
	for (const c of ids.competicoes) competicoes.set(c, inq);
	for (const j of ids.jogos) if (j != null) jogos.set(j, inq);
}

/** Só para os testes. */
export function esquecer() {
	competicoes.clear();
	jogos.clear();
}

/** De quem é esta competição. Um número que ninguém registou é da APL, como sempre foi. */
export const daCompeticao = (id: number): Inquilino => competicoes.get(id) ?? ORIGINAL;

export const doJogo = (id: number): Inquilino => jogos.get(id) ?? ORIGINAL;

export const prefixo = (inq: Inquilino): string => (inq === ORIGINAL ? '' : `${inq}-`);

/** O segmento do endereço de um jogo: `9644` na APL, `fpp-18262` na FPP. */
export const idNaRota = (id: number, inq: Inquilino = doJogo(id)): string => `${prefixo(inq)}${id}`;

/** O endereço de um jogo. Todos os links para jogos passam por aqui. */
export const caminhoJogo = (id: number): string => `/jogo/${idNaRota(id)}`;

/**
 * O inverso de `idNaRota`: `"fpp-18262"` → FPP, 18262. Um número sem prefixo é da APL, e é
 * também o que um link antigo traz. `null` quando não é um jogo de ninguém.
 */
export function lerIdDaRota(segmento: string): { inq: Inquilino; id: number } | null {
	const m = /^(?:(fpp)-)?(\d+)$/.exec(segmento);
	if (!m) return null;
	return { inq: (m[1] as Inquilino | undefined) ?? ORIGINAL, id: Number(m[2]) };
}
