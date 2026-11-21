import { diaDeLisboa } from './dia';

/**
 * A app vestida de Natal, **de 1 de dezembro a 6 de janeiro** — ideia da filha do dono, que ele
 * trouxe a 20/11/2026: *"umas luzinhas em umas partes superiores… alguns ornamentos, algumas
 * prendinhas, algum Pai Natal… a neve a cair, assim muito suave, para não estar a abusar"*.
 *
 * **Fecha-se no calendário do código, e não num interruptor** (AGENTS.md): publica-se com o
 * resto, e a 7 de janeiro desaparece sozinha sem ninguém a tirar. O fim é o Dia de Reis, que é
 * quando em Portugal se desmonta a árvore.
 *
 * `?natal=1` mostra-a fora de época e `?natal=0` esconde-a — só para a ver no site de testes antes
 * de dezembro, e para tirar uma captura sem neve. Não se guarda em lado nenhum: a política de
 * privacidade enumera o que fica no aparelho, e isto não é uma coisa que valha uma chave.
 */
export function epocaDeNatal(dia: string): boolean {
	const [, mes, d] = dia.split('-').map(Number);
	return mes === 12 || (mes === 1 && d <= 6);
}

export function natalNoEndereco(url: URL, dia: string = diaDeLisboa()): boolean {
	const pedido = url.searchParams.get('natal');
	if (pedido === '1') return true;
	if (pedido === '0') return false;
	return epocaDeNatal(dia);
}

/**
 * O estado partilhado: o layout decide, e os enfeites espalhados pelos ecrãs leem daqui.
 *
 * - `emEpoca` — é Natal pelo calendário (ou pelo `?natal=1`);
 * - `desligado` — quem usa a app desligou os enfeites, no menu ☰, em Aparência;
 * - `ativo` — os dois juntos: é o que os enfeites consultam.
 */
export const natal = $state({ ativo: false, emEpoca: false, desligado: false });

/**
 * **Desligar os enfeites, e voltar a ligá-los.** Pedido do dono a 20/11/2026: *"tem de haver a
 * possibilidade de o utilizador conseguir desligar este modo natalício… mas que seja automático
 * com o sistema"*. Automático é a omissão e **não se guarda nada**, como o tema "Sistema" e a
 * cor verde: a chave só nasce se alguém os desligar, e a política de privacidade di-lo.
 */
const CHAVE = 'hoquei:natal:v1';

export function carregarNatal(armazem: Pick<Storage, 'getItem'> | null = guardado()) {
	try {
		natal.desligado = armazem?.getItem(CHAVE) === 'desligado';
	} catch {
		// armazenamento bloqueado: fica o automático
	}
}

export function escolherNatal(automatico: boolean, armazem: Pick<Storage, 'setItem' | 'removeItem'> | null = guardado()) {
	natal.desligado = !automatico;
	try {
		if (automatico) armazem?.removeItem(CHAVE);
		else armazem?.setItem(CHAVE, 'desligado');
	} catch {
		// não guardar é mau, não é motivo para não obedecer nesta sessão
	}
}

function guardado(): Storage | null {
	try {
		return typeof localStorage === 'undefined' ? null : localStorage;
	} catch {
		return null;
	}
}
