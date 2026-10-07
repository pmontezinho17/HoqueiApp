import type { Favorito } from './tipos';

const CHAVE = 'hoquei:favoritos:v1';

/**
 * Um favorito válido, ou nada (P11.8).
 *
 * **Isto não é defesa teórica.** Descoberto a 06/10/2026 ao testar o guia: o `ler()` aceitava
 * o que estivesse no `localStorage` com um `as Favorito[]` — que não verifica nada, é só uma
 * promessa ao compilador. Um favorito guardado por uma versão anterior, sem `competicoes`,
 * fazia o `resumir()` do `/clube` rebentar no `flatMap`, e a página ficava **sem cartões, sem
 * convite e sem erro à vista**. E esse é exactamente o estado de quem usa a app desde antes
 * do ecrã de escolha de equipas.
 *
 * O que não se faz aqui é inventar o que falta. Um favorito sem `competicoes` não se
 * "corrige" com uma lista vazia — isso dava uma equipa seguida que não aparece em prova
 * nenhuma, e um ecrã a mentir é pior do que um ecrã a pedir para escolher outra vez.
 * Descarta-se, e quem tinha esse favorito volta a ver o ecrã de escolha.
 */
function valido(x: unknown): x is Favorito {
	if (typeof x !== 'object' || x === null) return false;
	const f = x as Record<string, unknown>;
	return (
		typeof f.equipa === 'string' &&
		f.equipa.length > 0 &&
		typeof f.categoria === 'string' &&
		f.categoria.length > 0 &&
		Array.isArray(f.competicoes) &&
		f.competicoes.every((c) => typeof c === 'number' && Number.isFinite(c))
	);
}

/** Lê e valida. Fora da classe para ser testável sem DOM nem `localStorage`. */
export function interpretar(cru: string | null): Favorito[] {
	if (!cru) return [];
	try {
		const lido: unknown = JSON.parse(cru);
		// já se viu um objecto onde devia estar uma lista; `filter` num objecto rebentava aqui
		if (!Array.isArray(lido)) return [];
		return lido.filter(valido);
	} catch {
		return [];
	}
}

function ler(): { lista: Favorito[]; descartados: number } {
	try {
		const cru = localStorage.getItem(CHAVE);
		const lista = interpretar(cru);
		const total = (() => {
			try {
				const x: unknown = cru ? JSON.parse(cru) : [];
				return Array.isArray(x) ? x.length : 0;
			} catch {
				return 0;
			}
		})();
		return { lista, descartados: Math.max(0, total - lista.length) };
	} catch {
		// modo privado ou armazenamento bloqueado: a app tem de abrir na mesma
		return { lista: [], descartados: 0 };
	}
}

/** Estado partilhado por toda a app. Local-first: nunca precisa de conta (Decisão 3). */
class Favoritos {
	lista = $state<Favorito[]>([]);
	/**
	 * Já se leu o armazenamento.
	 *
	 * Sem isto não se distingue "ainda não li" de "li e não há nada", porque a lista é `[]`
	 * nos dois casos — e quem precisa de decidir se mostra o ecrã de escolha de equipas
	 * decidia com base numa lista que ainda não tinha chegado.
	 */
	carregado = $state(false);

	carregar() {
		const cru = ler();
		this.lista = cru.lista;
		this.carregado = true;
		// Se a leitura descartou alguma coisa, grava-se a lista limpa. Sem isto o favorito
		// inválido ficava no aparelho para sempre, a ser descartado em cada abertura — e o
		// próximo a ler aquele armazenamento voltava a tropeçar no mesmo.
		if (cru.descartados) this.gravar();
	}

	private gravar() {
		try {
			localStorage.setItem(CHAVE, JSON.stringify(this.lista));
		} catch {
			/* sem armazenamento a escolha vale só para esta sessão, mas não parte nada */
		}
	}

	segue(equipa: string, categoria: string): boolean {
		return this.lista.some((f) => f.equipa === equipa && f.categoria === categoria);
	}

	alternar(equipa: string, categoria: string, competicoes: number[]) {
		this.lista = this.segue(equipa, categoria)
			? this.lista.filter((f) => !(f.equipa === equipa && f.categoria === categoria))
			: [...this.lista, { equipa, categoria, competicoes }];
		this.gravar();
	}
}

export const favoritos = new Favoritos();
