import { carregarEquipas } from '$lib/dados';
import type { PageLoad } from './$types';

export const prerender = false;

/** O índice de equipas serve o seletor de "seguir". Os calendários das equipas seguidas
 *  são carregados no browser, porque é lá que vivem os favoritos. */
export const load: PageLoad = async ({ fetch }) => ({
	equipas: (await carregarEquipas(fetch)).equipas
});
