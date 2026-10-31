/**
 * Uma tabela só rola para o lado quando não cabe.
 *
 * ## Porque é que isto existe
 *
 * Um elemento com `overflow-x: auto` é uma caixa de scroll **caiba ou não caiba o que tem
 * dentro**, e o browser entrega-lhe todos os arrastos horizontais que comecem lá dentro. A
 * `Faixa` que muda de separador nunca chega a saber deles. O dono deu com isto a 31/10/2026,
 * no telemóvel, no Plantel de uma equipa: *"não consigo deslizar novamente para a tab
 * classificação"* — e a tabela dele cabia no ecrã e não rolava. Um gesto que não faz nada,
 * por cima de uma tabela que não se mexe, num ecrã onde o mesmo gesto funciona ao lado.
 *
 * Por isso a caixa só passa a ser de scroll quando o conteúdo é mais largo do que ela. Quando
 * cabe fica `visible`, o arrasto é da `Faixa`, e muda de separador como no resto do ecrã. Quando
 * não cabe — a classificação completa, com onze colunas — o arrasto é da tabela, como em
 * qualquer aplicação: rolar o que rola vem primeiro.
 *
 * O CSS de cada tabela continua a dizer `overflow-x: auto`. É o que vale antes de o script
 * correr, e o que vale se ele não correr: uma tabela que rola sempre é o defeito de antes, e
 * não uma tabela cortada.
 */

/** Um píxel de folga: arredondamentos de sub-píxel não fazem uma tabela que rola. */
export function precisaDeRolar(conteudo: number, caixa: number): boolean {
	return conteudo > caixa + 1;
}

export function rolarSoSePreciso(no: HTMLElement) {
	const medir = () => {
		// `scrollWidth` mede o conteúdo inteiro também com `overflow: visible`, por isso a
		// conta não depende do estado em que a caixa está
		no.style.overflowX = precisaDeRolar(no.scrollWidth, no.clientWidth) ? 'auto' : 'visible';
	};
	medir();
	// a tabela muda de largura sem a caixa mudar (a vista completa acrescenta colunas), e a
	// caixa muda sem a tabela mudar (rodar o telemóvel): observam-se as duas
	const obs = new ResizeObserver(medir);
	obs.observe(no);
	if (no.firstElementChild) obs.observe(no.firstElementChild);
	return { destroy: () => obs.disconnect() };
}
