/**
 * Contar **aparelhos distintos por dia**, sem identificador nenhum.
 *
 * O dono perguntou quantas pessoas abrem a app. A resposta honesta é que o contador do
 * servidor não sabe: uma app aberta pede o `meta.json` de 5 em 5 minutos, e de 30 em 30
 * segundos durante um jogo, por isso as ~120 aberturas de 08/10/2026 podiam ser duas pessoas
 * numa bancada ou sessenta a espreitar dez segundos. Trinta vezes de diferença.
 *
 * ## O truque, e porque é que não é rastreio
 *
 * **É o próprio aparelho que decide se já foi contado hoje.** Guarda uma data — `2026-10-08`
 * — e só na primeira abertura do dia é que avisa o servidor. Nas seguintes fica calado.
 *
 * O servidor recebe um toque por aparelho e por dia, e **não tem como ligar o de hoje ao de
 * ontem**: não vai número nenhum, não há cookie, e o que fica guardado no aparelho é uma data,
 * que não identifica ninguém. É a diferença entre "hoje abriram isto 14 aparelhos" e "o
 * aparelho X abriu isto 9 dias seguidos" — a segunda frase exigiria um identificador, e esse
 * não existe de propósito.
 *
 * ## O que isto é, e o que não é
 *
 * São **aparelhos**, não pessoas: o telemóvel e o PC da mesma pessoa contam dois, e quem
 * limpar os dados do site conta outra vez. E não dá coortes nem "quantos voltaram na semana
 * seguinte", porque isso é precisamente o que se evitou poder fazer.
 *
 * O segundo sinalizador — `conhecido` — é um bit: diz se este aparelho já tinha aberto a app
 * alguma vez. Dá "quantos são novos hoje" sem dizer quem.
 */
const CHAVE_DIA = 'hoquei:contado:v1';
const CHAVE_CONHECIDO = 'hoquei:conhecido:v1';

/** A data de Lisboa, que é a que define "hoje" em todo o projecto. */
export const diaDeLisboa = (quando = new Date()) =>
	quando.toLocaleDateString('sv-SE', { timeZone: 'Europe/Lisbon' });

/**
 * O que fazer, dado o que está guardado. Função pura, para ser testável sem browser.
 *
 * `null` é o caso normal — já se contou hoje, não se faz nada. É também o que acontece
 * quando o armazenamento está bloqueado: **não se conta**, porque um aparelho que não
 * consegue guardar a data contaria em cada abertura e inflacionava o número. Preferir um
 * número baixo e verdadeiro a um número alto e inventado.
 */
export function decidir(
	guardado: { dia: string | null; conhecido: string | null },
	hoje: string
): { novo: boolean } | null {
	if (guardado.dia === hoje) return null;
	return { novo: guardado.conhecido !== '1' };
}

/**
 * Avisa o contador, uma vez por dia e por aparelho.
 *
 * Nada disto pode atrasar nem partir a app: vai tudo dentro de um `try`, o pedido é
 * disparado e esquecido, e um erro de rede não faz diferença — perde-se uma contagem.
 */
export function marcarPresenca(
	buscar: typeof fetch = fetch,
	// injectável, como o `fetch`: assim o teste corre em Node sem arrastar um jsdom para o
	// projecto só por causa de duas chamadas ao armazenamento
	armazem: Pick<Storage, 'getItem' | 'setItem'> | null = typeof localStorage === 'undefined'
		? null
		: localStorage
): void {
	if (!armazem) return;
	let guardado: { dia: string | null; conhecido: string | null };
	try {
		guardado = {
			dia: armazem.getItem(CHAVE_DIA),
			conhecido: armazem.getItem(CHAVE_CONHECIDO)
		};
	} catch {
		return; // janela privada ou armazenamento bloqueado: não se conta
	}

	const hoje = diaDeLisboa();
	const decisao = decidir(guardado, hoje);
	if (!decisao) return;

	try {
		armazem.setItem(CHAVE_DIA, hoje);
		armazem.setItem(CHAVE_CONHECIDO, '1');
	} catch {
		return;
	}

	// `no-store` dos dois lados: uma contagem servida da cache não é uma contagem.
	//
	// E dentro de um `try`, não só de um `.catch`: um `fetch` bloqueado por política de
	// segurança atira **antes** de devolver promessa nenhuma, e aí o `.catch` não existe
	// para apanhar nada. Foi o teste que o apanhou, com um duplo que não devolvia promessa.
	try {
		void Promise.resolve(
			buscar(`/contar?novo=${decisao.novo ? 1 : 0}`, { cache: 'no-store', keepalive: true })
		).catch(() => {});
	} catch {
		/* uma contagem perdida não é motivo para nada */
	}
}
