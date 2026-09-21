import { carregarIndice, carregarCompeticao } from '$lib/dados';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, url }) => {
	const indice = await carregarIndice(fetch);
	const pedido = Number(url.searchParams.get('comp'));
	const escolhida =
		indice.competicoes.find((c) => c.id === pedido) ??
		indice.competicoes.find((c) => c.categoria === 'SENIORES MASCULINOS') ??
		indice.competicoes[0];
	return { indice, dados: await carregarCompeticao(escolhida.id, fetch), escolhida };
};
