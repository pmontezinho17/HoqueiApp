import { carregarAgenda } from '$lib/dados';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => ({
	agenda: (await carregarAgenda(fetch)).jogos
});
