import { carregarAgenda, carregarEmblemas, carregarEquipas, carregarIndice, carregarMeta } from '$lib/dados';
import type { LayoutLoad } from './$types';

export const prerender = true;
export const ssr = false;

/** Tudo o que é transversal aos ecrãs, num só lote. Os ficheiros são pequenos e a cache
 *  do service worker serve-os de imediato nas visitas seguintes. */
export const load: LayoutLoad = async ({ fetch }) => {
	const [indice, meta, emblemas, equipas, agenda] = await Promise.all([
		carregarIndice(fetch),
		carregarMeta(fetch),
		carregarEmblemas(fetch).catch(() => ({}) as Record<string, string>),
		carregarEquipas(fetch).then((r) => r.equipas).catch(() => []),
		carregarAgenda(fetch).then((r) => r.jogos)
	]);
	return { indice, meta, emblemas, equipas, agenda };
};
