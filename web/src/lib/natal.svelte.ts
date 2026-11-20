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

/** O estado partilhado: o layout decide, e os enfeites espalhados pelos ecrãs leem daqui. */
export const natal = $state({ ativo: false });
