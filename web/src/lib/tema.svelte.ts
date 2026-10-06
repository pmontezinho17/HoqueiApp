/**
 * O tema escolhido à mão, contra o do sistema (P11.4).
 *
 * **O modo escuro já existia** e funcionava pelo `prefers-color-scheme`. O que faltava era
 * poder discordar do sistema: quem tem o telemóvel sempre em claro e quer a app escura num
 * pavilhão, ou o contrário.
 *
 * `sistema` **não se guarda**. A ausência da chave é a omissão, e por isso quem nunca
 * escolheu nada não deixa nada escrito no aparelho — é o que mantém a página de privacidade
 * honesta sem lhe acrescentar uma chave que a maioria nunca vai ter. Escolher "como o
 * sistema" depois de ter escolhido outra coisa apaga a chave em vez de escrever lá
 * `sistema`.
 */
const CHAVE = 'hoquei:tema:v1';

export type Tema = 'sistema' | 'claro' | 'escuro';

export const TEMAS: { valor: Tema; rotulo: string }[] = [
	{ valor: 'sistema', rotulo: 'Sistema' },
	{ valor: 'claro', rotulo: 'Claro' },
	{ valor: 'escuro', rotulo: 'Escuro' }
];

/**
 * As cores da barra do browser, **iguais às do `app.html`**.
 *
 * Estão repetidas de propósito e não há como não estar: aquelas vivem em `<meta>` no HTML
 * estático, para a barra já estar certa antes de o JavaScript arrancar, e estas servem para
 * as reescrever quando a escolha contraria o sistema. Quem mudar uma muda a outra.
 */
const BARRA: Record<'claro' | 'escuro', string> = { claro: '#f6f7f9', escuro: '#0f1115' };

/** Lê o que está guardado. Fora da classe para ser testável sem DOM nem `localStorage`. */
export function interpretar(cru: string | null): Tema {
	return cru === 'claro' || cru === 'escuro' ? cru : 'sistema';
}

class Preferencia {
	escolha = $state<Tema>('sistema');

	carregar() {
		try {
			this.escolha = interpretar(localStorage.getItem(CHAVE));
		} catch {
			// browser com armazenamento bloqueado: fica o do sistema, que é o que já havia
		}
		this.aplicar();
	}

	escolher(t: Tema) {
		this.escolha = t;
		try {
			if (t === 'sistema') localStorage.removeItem(CHAVE);
			else localStorage.setItem(CHAVE, t);
		} catch {
			// não guardar é mau mas não é motivo para não aplicar nesta sessão
		}
		this.aplicar();
	}

	/**
	 * Põe a escolha no `<html>`, e com ela três coisas que têm de andar juntas:
	 *
	 * 1. `data-tema`, que é por onde o CSS do `+layout.svelte` decide os *tokens* de cor;
	 * 2. `color-scheme`, senão as barras de deslocamento e os campos de formulário
	 *    continuam desenhados pelo tema do sistema — uma app escura com um campo branco;
	 * 3. os dois `<meta name="theme-color">`, senão a barra do browser e a do iPhone em modo
	 *    aplicação ficam da cor do sistema contra uma app da cor oposta. Reescrevem-se os
	 *    dois com a mesma cor: assim qualquer deles que o browser escolha dá a cor certa.
	 */
	private aplicar() {
		if (typeof document === 'undefined') return;
		const raiz = document.documentElement;
		if (this.escolha === 'sistema') {
			delete raiz.dataset.tema;
			raiz.style.colorScheme = '';
		} else {
			raiz.dataset.tema = this.escolha;
			raiz.style.colorScheme = this.escolha === 'escuro' ? 'dark' : 'light';
		}
		for (const m of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"][media]')) {
			// a primeira passagem guarda a cor original, que é a que volta se escolher "sistema"
			m.dataset.original ??= m.content;
			m.content = this.escolha === 'sistema' ? m.dataset.original : BARRA[this.escolha];
		}
	}
}

export const tema = new Preferencia();
