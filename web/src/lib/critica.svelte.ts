/**
 * Se o painel de crítica está aberto.
 *
 * Passou a viver fora do `Feedback.svelte` porque passou a ter dois sítios de onde se abre:
 * a bolha flutuante e a linha "Dar uma opinião" no menu do ⋮. Com o estado dentro do
 * componente, o menu não tinha como lhe chegar.
 *
 * A bolha fica **e** a linha fica. Não é descuido: a bolha é temporária — sai com o
 * `RECOLHER_FEEDBACK`, e é ela que o guia ilumina no último passo — e a linha do menu é a
 * casa definitiva da funcionalidade.
 */
class Critica {
	aberto = $state(false);

	abrir() {
		this.aberto = true;
	}

	fechar() {
		this.aberto = false;
	}
}

export const critica = new Critica();
