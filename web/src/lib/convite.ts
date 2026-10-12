/**
 * O convite para pôr a app no ecrã principal — e porque é que ele só existe no iPhone.
 *
 * ## O problema que isto ataca
 *
 * No iOS, o Safari **apaga o armazenamento de um site** depois de 7 dias sem visitas. Não é
 * uma avaria nem uma opção: é a política de protecção contra rastreio, e aplica-se a tudo o
 * que o nosso código escreve — os favoritos, o tema, a marca do guia. A excepção é uma só:
 * **um site que esteja no ecrã principal** não entra nesse tecto.
 *
 * Uma aplicação de resultados abre-se no fim de semana do jogo. Sete dias é exactamente o
 * intervalo entre duas jornadas, e por isso este tecto não é um caso de fronteira para nós —
 * é o caso normal. O cunhado do dono, a 12/10/2026: *"cada vez que entra na aplicação ...
 * fica sem as equipas como favorito"*.
 *
 * Não há forma de o contornar em código. O `navigator.storage.persist()`, que no Android e no
 * desktop pede armazenamento durável, **não está implementado no Safari**. O que resta é
 * dizer à pessoa a única coisa que resolve, uma vez, e calar-se.
 *
 * ## Porque é que não aparece no Android
 *
 * Porque lá não há problema para resolver: o Chrome não apaga o armazenamento por inactividade
 * e já mostra o seu próprio convite de instalação, sem precisar do nosso. Um aviso a mais num
 * sítio onde não serve de nada é ruído, e este projecto tem a regra de contar antes de
 * acrescentar.
 *
 * ## As duas mensagens, e porque é que são duas
 *
 * Dentro de um browser que vive **noutra aplicação** — um link tocado no WhatsApp, no
 * Instagram — não há "Adicionar ao ecrã principal" nenhum para tocar, e o armazenamento é
 * dessa sessão e desaparece com ela. Dizer "adiciona ao ecrã principal" a quem está ali é
 * mandá-lo procurar um botão que não existe. A essa pessoa diz-se a coisa que a desbloqueia,
 * que é abrir no Safari.
 *
 * E é o caso que mais provavelmente se aplica a quem recebeu o endereço numa mensagem — que é
 * como o endereço desta app andou a circular.
 */

/** A marca de "já vi este convite". Enumerada na `/privacidade`, como todas. */
export const CHAVE = 'hoquei:convite-visto:v1';

export type Convite = 'nada' | 'instalar' | 'abrir-no-safari';

export type Aparelho = {
	ua: string;
	/**
	 * O `navigator.standalone`, que é só do iOS e tem **três** valores que importam:
	 * `true` já está no ecrã principal, `false` está no Safari, e `undefined` está numa vista
	 * dentro de outra aplicação. É esse `undefined` que distingue o terceiro caso, e não há
	 * outra forma honesta de o ver.
	 */
	standalone: boolean | undefined;
	/** `display-mode: standalone` — é assim que o Android e o desktop dizem "sou uma app" */
	comoApp: boolean;
	/** para apanhar o iPad, que se apresenta como um Mac desde o iPadOS 13 */
	maxTouchPoints: number;
	dispensado: boolean;
};

const DIZ_IOS = /iP(hone|od|ad)/;

/**
 * Se isto é um aparelho da Apple com ecrã táctil.
 *
 * O iPad não diz `iPad` desde o iPadOS 13: diz `Macintosh`, igual a um portátil. O que os
 * separa é o ecrã táctil, e é por isso que o número de toques entra nesta conta.
 */
function ehIOS(a: Aparelho): boolean {
	return DIZ_IOS.test(a.ua) || (/Macintosh/.test(a.ua) && a.maxTouchPoints > 1);
}

/**
 * O que mostrar, dado o aparelho. Pura, e é onde vive toda a decisão.
 *
 * A ordem das guardas não é arbitrária: **"já está instalado" vem antes de tudo**, porque a
 * quem já fez o que lhe pedimos não se volta a pedir, venha ele de onde vier.
 */
export function decidirConvite(a: Aparelho): Convite {
	if (a.dispensado) return 'nada';
	if (a.comoApp || a.standalone === true) return 'nada';
	if (!ehIOS(a)) return 'nada';
	// A vista dentro de outra aplicação só se afirma quando o UA diz mesmo iPhone ou iPad. No
	// iPad que se apresenta como Mac o `standalone` também não existe, e aí **não sabemos** se
	// é uma vista embutida ou o Safari — e inventar "abre no Safari" a quem já está no Safari
	// manda a pessoa procurar um botão que ela não vai encontrar.
	if (DIZ_IOS.test(a.ua) && a.standalone === undefined) return 'abrir-no-safari';
	return 'instalar';
}

/** O aparelho, lido do browser. Separado da decisão para a decisão poder ser testada. */
export function esteAparelho(dispensado: boolean): Aparelho | null {
	if (typeof navigator === 'undefined') return null;
	const n = navigator as Navigator & { standalone?: boolean };
	return {
		ua: n.userAgent ?? '',
		standalone: n.standalone,
		comoApp:
			typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches,
		maxTouchPoints: n.maxTouchPoints ?? 0,
		dispensado
	};
}
