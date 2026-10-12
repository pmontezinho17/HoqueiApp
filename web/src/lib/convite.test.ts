import { describe, expect, it } from 'vitest';
import { decidirConvite, type Aparelho, type Convite } from './convite';

/**
 * O convite para pôr a app no ecrã principal. A razão de existir está no `convite.ts`; isto
 * verifica a decisão, que é a parte que se pode enganar sem ninguém notar — um aviso a mais
 * aparece a quem não precisa dele, e um aviso a menos não resolve o problema de quem precisa.
 *
 * Os `ua` são reais, copiados de aparelhos a sério, porque uma expressão regular escrita
 * contra um UA inventado acerta no UA inventado.
 */
const IPHONE =
	'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 ' +
	'(KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const IPHONE_WHATSAPP =
	'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 ' +
	'(KHTML, like Gecko) Mobile/15E148';
const IPAD_COMO_MAC =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 ' +
	'(KHTML, like Gecko) Version/17.5 Safari/605.1.15';
const ANDROID =
	'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) ' +
	'Chrome/126.0.0.0 Mobile Safari/537.36';
const MAC =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) ' +
	'Chrome/126.0.0.0 Safari/537.36';

function aparelho(p: Partial<Aparelho> = {}): Aparelho {
	return {
		ua: IPHONE,
		standalone: false,
		comoApp: false,
		maxTouchPoints: 5,
		dispensado: false,
		...p
	};
}

describe('a quem se mostra o convite', () => {
	const casos: [string, Partial<Aparelho>, Convite][] = [
		['iPhone no Safari, sem a app instalada', {}, 'instalar'],
		['iPad que se apresenta como Mac', { ua: IPAD_COMO_MAC, standalone: undefined }, 'instalar'],
		[
			'iPhone dentro de outra aplicação — ali não há botão de instalar',
			{ ua: IPHONE_WHATSAPP, standalone: undefined },
			'abrir-no-safari'
		],
		['iPhone com a app já no ecrã principal', { standalone: true }, 'nada'],
		['iPhone que já dispensou o aviso', { dispensado: true }, 'nada'],
		['Android, onde o Chrome não apaga nada por inactividade', { ua: ANDROID }, 'nada'],
		[
			'Android instalado, que se anuncia pelo modo de ecrã',
			{ ua: ANDROID, comoApp: true },
			'nada'
		],
		['Mac de secretária, sem ecrã táctil', { ua: MAC, standalone: undefined, maxTouchPoints: 0 }, 'nada']
	];

	for (const [nome, p, esperado] of casos)
		it(nome, () => expect(decidirConvite(aparelho(p))).toBe(esperado));

	it('a dispensa manda em tudo, venha o aparelho de onde vier', () => {
		for (const ua of [IPHONE, IPHONE_WHATSAPP, IPAD_COMO_MAC])
			expect(decidirConvite(aparelho({ ua, dispensado: true }))).toBe('nada');
	});

	it('quem já instalou nunca vê nada — nem a mensagem do Safari', () => {
		/**
		 * **Esta é a ordem que importa.** Se a guarda da vista embutida corresse antes da do
		 * "já está instalado", uma app no ecrã principal cujo `standalone` não chegasse a
		 * tempo levava um "abre no Safari" — a dizer a quem já fez o que pedimos para o
		 * desfazer.
		 */
		expect(decidirConvite(aparelho({ standalone: true, comoApp: true }))).toBe('nada');
		expect(decidirConvite(aparelho({ ua: IPHONE_WHATSAPP, comoApp: true }))).toBe('nada');
	});

	it('um iPad como Mac nunca recebe "abre no Safari"', () => {
		/**
		 * Ali o `standalone` não existe nem no Safari, por isso não se sabe se é uma vista
		 * embutida. Mandar abrir no Safari quem já está no Safari é mandá-lo procurar um botão
		 * que não vai encontrar — e aí a dica desacredita a app em vez de a ajudar.
		 */
		expect(decidirConvite(aparelho({ ua: IPAD_COMO_MAC, standalone: undefined }))).not.toBe(
			'abrir-no-safari'
		);
	});
});
