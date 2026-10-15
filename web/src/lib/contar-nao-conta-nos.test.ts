import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * **O contador não pode contar-nos a nós.**
 *
 * A 15/10/2026, às 07:53, o dono olhou para a consola e não acreditou no que via: 16 "entradas"
 * durante a madrugada. *"Durante a noite foram vistos várias vezes a aplicação? Tenho muitas
 * dúvidas."* Tinha razão. Eram a nossa vigia: o `verificar_producao.py` sonda o `/contar?novo=0`
 * para saber se as Pages Functions correm, e corre de quinze em quinze minutos pelo `saude.yml`
 * mais uma vez por publicação. Contado nessa manhã: **15 corridas de sonda contra 16 entradas**,
 * com a mesma forma hora a hora.
 *
 * O sinal estava à vista e eu não o li: **zero "pela primeira vez"** — a sonda manda sempre
 * `novo=0`. E a série diária tinha um degrau exactamente no dia em que a vigia nasceu: 40
 * aparelhos a 12/10, 84 a 13/10.
 *
 * A lição já estava escrita no `_middleware.js` desde 09/10, para o contador de ecrãs: *"um
 * número que cresce quando olhamos mais para ele"*. Faltava aplicá-la aqui, e fui eu que
 * acrescentei a sonda sem o fazer.
 *
 * Este teste é de texto, como os outros que olham para as Functions — o que ele garante é que a
 * guarda não desaparece numa reorganização. Que ela funciona está medido no site publicado: com
 * o `User-Agent` da sonda, o `/contar` devolve 204 e a base de dados não mexe.
 */
describe('o /contar ignora os nossos próprios pedidos', () => {
	const contar = readFileSync(new URL('../../functions/contar.js', import.meta.url), 'utf-8');
	const middleware = readFileSync(
		new URL('../../functions/_middleware.js', import.meta.url),
		'utf-8'
	);
	const sonda = readFileSync(new URL('../../../scripts/verificar_producao.py', import.meta.url), 'utf-8');

	it('tem a guarda, e é a mesma dos ecrãs', () => {
		// O mesmo padrão nos dois sítios, de propósito: dois padrões diferentes divergem no dia
		// em que alguém acrescenta um agente novo e só se lembra de um deles.
		const padrao = /const NOSSO = \/\^hoqueiAPP\/i;/;
		expect(contar).toMatch(padrao);
		expect(middleware).toMatch(padrao);
	});

	it('a guarda corre antes de qualquer escrita', () => {
		// Depois do primeiro INSERT não servia de nada.
		const guarda = contar.indexOf('NOSSO.test(');
		const primeiraEscrita = contar.indexOf('INSERT INTO');
		expect(guarda).toBeGreaterThan(-1);
		expect(guarda).toBeLessThan(primeiraEscrita);
	});

	it('e a sonda continua a identificar-se com o prefixo que a guarda reconhece', () => {
		// Se o `UA` da sonda deixar de começar por `hoqueiAPP`, a guarda deixa de a apanhar e o
		// contador volta a inflacionar-se em silêncio — que é exactamente o modo de falha que
		// custou três dias de números errados.
		const ua = sonda.match(/^UA = "([^"]+)"/m)?.[1] ?? '';
		expect(ua).toMatch(/^hoqueiAPP/);
	});
});
