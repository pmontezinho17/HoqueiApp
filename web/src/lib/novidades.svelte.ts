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

/** O estado da caixa. Lê o armazenamento uma vez, no arranque, e nunca falha por causa dele. */
export function novidades() {
	let aMostrar = $state<Novidade[]>([]);

	function arrancar() {
		let vista: string | null = null;
		try {
			vista = localStorage.getItem(CHAVE);
		} catch {
			return; // janela privada ou armazenamento bloqueado: não se mostra nada
		}
		aMostrar = porMostrar(vista);
		// **A versão guarda-se logo, mesmo antes de a caixa ser lida.** Se só se guardasse ao
		// fechar, quem fechasse a aplicação a meio voltava a ver a mesma lista — e uma caixa
		// que reaparece é pior do que uma caixa que se perdeu.
		try {
			localStorage.setItem(CHAVE, VERSAO);
		} catch {
			/* não se pode guardar: mostra-se esta vez e pronto */
		}
	}

	return {
		get lista() {
			return aMostrar;
		},
		get aberta() {
			return aMostrar.length > 0;
		},
		arrancar,
		fechar: () => (aMostrar = [])
	};
}
