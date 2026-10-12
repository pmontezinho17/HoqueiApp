/**
 * A caixa do "o que mudou", e quando é que ela aparece.
 *
 * ## A regra, e porque é esta
 *
 * **Só aparece a quem já usava a app antes desta versão.** Um aparelho que abre a aplicação
 * pela primeira vez não tem nada de "novo" para ver — mostrar-lhe uma lista de alterações é
 * uma interrupção sem conteúdo, e é a forma mais rápida de ensinar alguém a fechar caixas sem
 * ler. Por isso a ausência da chave guarda a versão em silêncio e não mostra nada.
 *
 * **E aparece uma vez por versão, não uma vez por publicação.** É o par com a versão fixa do
 * `versao.ts`: antes, cada publicação avisava todos — mesmo uma que só mexesse na consola.
 * Agora quem publica decide, ao subir o número, se aquilo vale a interrupção.
 */
import { NOVIDADES, VERSAO, type Novidade } from './versao';

const CHAVE = 'hoquei:versao-vista:v1';

/**
 * As novidades a mostrar, dado o que o aparelho viu da última vez. Função pura.
 *
 * `[]` quer dizer "não mostrar nada", e isso acontece em três casos que são todos o caso
 * normal: é a primeira visita, já se viu esta versão, ou a versão nova não trouxe nada que se
 * note a usar.
 */
export function porMostrar(vista: string | null, versao = VERSAO, lista = NOVIDADES): Novidade[] {
	if (!vista || vista === versao) return [];
	// só o que entrou **depois** do que este aparelho já viu: quem salta da 1.0 para a 1.3 vê
	// as três, e quem vem da 1.2 vê uma
	const desde = lista.findIndex((n) => n.versao === vista);
	return desde < 0 ? lista : lista.slice(0, desde);
}

/**
 * O que a caixa mostra quando **alguém a pede** no menu. Função pura.
 *
 * É outra pergunta que a do `porMostrar`, e por isso é outra função. O `porMostrar` responde a
 * "há aqui alguma coisa que valha interromper esta pessoa?", e a resposta certa é quase sempre
 * não. Esta responde a "ele pediu para ver — mostra o quê?", e aí não se pode devolver nada:
 * um botão que não faz nada é pior do que não haver botão.
 *
 * Mostra o que entrou **nesta versão**, que é o que o dono pediu a 12/10/2026 — *"para que as
 * pessoas possam ver novamente o que há de novo nesta versão"*. Se a versão em curso não
 * trouxer notas nenhumas — o caso de uma publicação que só mexe no raspador — cai na entrada
 * mais recente da lista, que é a última coisa que mudou para quem usa a app.
 */
export function aReabrir(versao = VERSAO, lista = NOVIDADES): Novidade[] {
	const desta = lista.filter((n) => n.versao === versao);
	return desta.length ? desta : lista.slice(0, 1);
}

/**
 * O estado da caixa. Lê o armazenamento uma vez, no arranque, e nunca falha por causa dele.
 *
 * **Um só objecto para toda a app**, como o `tema`, a `cor` e o `guia` — e não uma fábrica,
 * que era o que isto era até 12/10/2026. A fábrica dava uma instância por chamada, e por isso
 * a caixa só podia ser aberta de dentro de si mesma: o menu não tinha como lhe falar. É essa
 * a razão da mudança, e não arrumação.
 */
class Novidades {
	private aMostrar = $state<Novidade[]>([]);

	get lista() {
		return this.aMostrar;
	}

	get aberta() {
		return this.aMostrar.length > 0;
	}

	arrancar() {
		let vista: string | null = null;
		try {
			vista = localStorage.getItem(CHAVE);
		} catch {
			return; // janela privada ou armazenamento bloqueado: não se mostra nada
		}
		this.aMostrar = porMostrar(vista);
		// **A versão guarda-se logo, mesmo antes de a caixa ser lida.** Se só se guardasse ao
		// fechar, quem fechasse a aplicação a meio voltava a ver a mesma lista — e uma caixa
		// que reaparece é pior do que uma caixa que se perdeu.
		try {
			localStorage.setItem(CHAVE, VERSAO);
		} catch {
			/* não se pode guardar: mostra-se esta vez e pronto */
		}
	}

	/**
	 * A pedido, do menu. Nasceu de um acidente do dono a 12/10/2026: *"sem querer carreguei em
	 * alguma coisa que me fez tirar a janela com as novidades"*. A caixa fechava-se com um
	 * toque e não havia segundo caminho para ela — e a lista de novidades é precisamente o que
	 * se fecha sem ler e depois se quer ler.
	 *
	 * Não mexe no armazenamento: a marca da versão já lá está desde o arranque, e isto não é
	 * um aviso novo, é a mesma folha outra vez.
	 */
	reabrir() {
		this.aMostrar = aReabrir();
	}

	fechar() {
		this.aMostrar = [];
	}
}

export const novidades = new Novidades();

/** Se há sequer alguma coisa para reabrir — o menu esconde a linha quando não há. */
export const HA_NOVIDADES = NOVIDADES.length > 0;
