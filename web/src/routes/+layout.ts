import { carregarIndice, carregarCompeticao, carregarEmblemas, carregarMeta } from '$lib/dados';
import type { LayoutLoad } from './$types';

export const prerender = true;
export const ssr = false;

/** A competição escolhida vive no URL (`?comp=`) e é partilhada por Jogos e Classificações. */
export const load: LayoutLoad = async ({ fetch, url }) => {
	const [indice, meta, emblemas] = await Promise.all([
		carregarIndice(fetch),
		carregarMeta(fetch),
		carregarEmblemas(fetch).catch(() => ({}) as Record<string, string>)
	]);
	const pedido = Number(url.searchParams.get('comp'));
	const escolhida =
		indice.competicoes.find((c) => c.id === pedido) ??
		indice.competicoes.find((c) => c.categoria === 'SENIORES MASCULINOS') ??
		indice.competicoes[0];
	return { indice, meta, emblemas, escolhida, dados: await carregarCompeticao(escolhida.id, fetch) };
};
