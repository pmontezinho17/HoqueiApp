import { carregarQuadro } from '$lib/dados';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, parent }) => {
	const { escolhida } = await parent();
	try {
		return { quadro: await carregarQuadro(escolhida.id, fetch) };
	} catch {
		// uma competição sem jogos disputados não tem ficheiro de quadros
		return { quadro: null };
	}
};
