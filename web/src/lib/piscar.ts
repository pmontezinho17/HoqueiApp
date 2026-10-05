/**
 * Pisca um elemento quando o valor que ele mostra muda.
 *
 * Num jogo a decorrer a app vai buscar dados de 30 em 30 segundos e o resultado passa de
 * 2–1 a 3–1 **sem se notar**: quem está a olhar para o ecrã não vê acontecer nada, e quem
 * não está não fica a saber que perdeu um golo. É a diferença entre uma lista que se
 * actualiza e uma que parece viva.
 *
 * Não pisca na primeira renderização — aí ainda não mudou nada, só apareceu. E quem pediu
 * menos movimento ao sistema não leva piscar nenhum.
 */
export function piscar(no: HTMLElement, valor: unknown) {
	let anterior = valor;
	const quieto = () =>
		typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

	return {
		update(novo: unknown) {
			if (novo === anterior) return;
			anterior = novo;
			if (quieto()) return;
			// tirar e repor não chega: sem ler uma propriedade de layout pelo meio, o browser
			// junta as duas mudanças numa só e a animação não recomeça
			no.classList.remove('piscou');
			void no.offsetWidth;
			no.classList.add('piscou');
		}
	};
}
