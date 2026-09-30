import type { Favorito } from './tipos';

const CHAVE = 'hoquei:favoritos:v1';

function ler(): Favorito[] {
	try {
		const cru = localStorage.getItem(CHAVE);
		return cru ? (JSON.parse(cru) as Favorito[]) : [];
	} catch {
		// modo privado, armazenamento bloqueado ou JSON corrompido: a app tem de abrir na mesma
		return [];
	}
}

/** Estado partilhado por toda a app. Local-first: nunca precisa de conta (Decisão 3). */
class Favoritos {
	lista = $state<Favorito[]>([]);

	carregar() {
		this.lista = ler();
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
