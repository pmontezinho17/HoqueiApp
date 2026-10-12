/**
 * A cor da aplicação, à escolha de quem a usa.
 *
 * Pedido pelo dono a 10/10/2026: *"seria interessante ter algumas cores (especialmente
 * aquelas que são mais parecidas com a cor das equipas) para que o utilizador possa
 * personalizar a sua aplicação"*.
 *
 * Muda **só o acento** — os botões, os separadores escolhidos, os destaques do calendário.
 * Não mexe no fundo nem no texto, e isso é deliberado: o contraste do corpo da app está
 * medido no claro e no escuro, e uma paleta inteira à escolha do utilizador põe esse
 * trabalho todo nas mãos de quem só queria o azul do clube dele.
 *
 * ## Duas cores da app querem dizer coisas, e não se deixam escolher
 *
 * O `--vivo` (laranja) quer dizer "está a acontecer agora" e o `--directo` (vermelho) quer
 * dizer "este jogo dá para ver". Quem escolher um acento vermelho vai ter a câmara da
 * transmissão da cor dos botões, e quem escolher laranja vai ter o mesmo com a marca de
 * jogo a decorrer. **Não é um defeito, é o preço de escolher a cor do clube** — e é melhor
 * do que lhe negarmos o vermelho, que é a cor mais comum nos clubes portugueses. Os dois
 * sinais continuam a ter forma própria: um ponto a pulsar e uma câmara.
 *
 * ## Porque é que cada cor tem quatro valores
 *
 * Duas para o acento — o claro precisa de uma cor escura para ler sobre branco, o escuro
 * precisa do contrário — e duas para o `--acento-fraco`, que é o fundo tingido das linhas
 * destacadas. Uma cor só dava texto ilegível num dos dois temas, e foi para não repetir
 * esse erro que os *tokens* já estavam separados no `+layout.svelte`.
 */
const CHAVE = 'hoquei:cor:v1';

export type Cor = {
	valor: string;
	rotulo: string;
	claro: string;
	escuro: string;
	fracoClaro: string;
	fracoEscuro: string;
};

/**
 * A paleta. O verde é o de sempre e é a omissão — **não se guarda nada quando é ele**, pela
 * mesma razão que o tema "sistema" não se guarda: quem nunca escolheu não deixa nada escrito
 * no aparelho, e a página de privacidade continua verdadeira para a maioria.
 */
export const CORES: Cor[] = [
	{ valor: 'verde', rotulo: 'Verde', claro: '#0a7d54', escuro: '#34d399',
		fracoClaro: '#e8f4ef', fracoEscuro: '#12271f' },
	{ valor: 'azul', rotulo: 'Azul', claro: '#1d4ed8', escuro: '#7aa7fb',
		fracoClaro: '#e8eefc', fracoEscuro: '#151e33' },
	{ valor: 'marinho', rotulo: 'Marinho', claro: '#1e3a8a', escuro: '#93b4fd',
		fracoClaro: '#e9edf8', fracoEscuro: '#151b2e' },
	{ valor: 'vermelho', rotulo: 'Vermelho', claro: '#b91c3c', escuro: '#fb7185',
		fracoClaro: '#fbe9ed', fracoEscuro: '#2c1219' },
	{ valor: 'grena', rotulo: 'Grená', claro: '#7f1d2e', escuro: '#e8909e',
		fracoClaro: '#f7e9ec', fracoEscuro: '#271317' },
	{ valor: 'roxo', rotulo: 'Roxo', claro: '#6d28d9', escuro: '#c4a0fb',
		fracoClaro: '#efe8fc', fracoEscuro: '#1e1630' }
];

export const OMISSAO = CORES[0].valor;

/** Lê o que está guardado. Fora da classe para ser testável sem DOM. */
export function interpretar(cru: string | null): string {
	return CORES.some((c) => c.valor === cru) ? (cru as string) : OMISSAO;
}

class Preferencia {
	escolha = $state<string>(OMISSAO);

	carregar() {
		try {
			this.escolha = interpretar(localStorage.getItem(CHAVE));
		} catch {
			// armazenamento bloqueado: fica o verde, que é o que já havia
		}
		this.aplicar();
	}

	escolher(valor: string) {
		this.escolha = interpretar(valor);
		try {
			if (this.escolha === OMISSAO) localStorage.removeItem(CHAVE);
			else localStorage.setItem(CHAVE, this.escolha);
		} catch {
			// não guardar é mau, não é motivo para não aplicar nesta sessão
		}
		this.aplicar();
	}

	/**
	 * Escreve os *tokens* no `<html>`, por cima dos do `+layout.svelte`.
	 *
	 * Os dois temas de uma vez, em variáveis próprias, e é o CSS que escolhe qual usar — ver
	 * o bloco no `+layout.svelte`. Escrever só a do tema activo obrigava isto a correr outra
	 * vez sempre que o sistema mudasse de claro para escuro ao fim da tarde, e ninguém se
	 * lembraria de ligar as duas coisas.
	 */
	private aplicar() {
		if (typeof document === 'undefined') return;
		const raiz = document.documentElement;
		const c = CORES.find((x) => x.valor === this.escolha) ?? CORES[0];
		if (this.escolha === OMISSAO) {
			for (const p of ['--c-claro', '--c-escuro', '--cf-claro', '--cf-escuro'])
				raiz.style.removeProperty(p);
			delete raiz.dataset.cor;
			return;
		}
		raiz.dataset.cor = c.valor;
		raiz.style.setProperty('--c-claro', c.claro);
		raiz.style.setProperty('--c-escuro', c.escuro);
		raiz.style.setProperty('--cf-claro', c.fracoClaro);
		raiz.style.setProperty('--cf-escuro', c.fracoEscuro);
	}
}

export const cor = new Preferencia();
