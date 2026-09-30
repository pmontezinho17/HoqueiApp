import { carregarJogo } from '$lib/dados';
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

// Não pré-renderizável: há uma ficha por jogo e vão nascendo todas as semanas.
// O adapter-static serve estas rotas pelo fallback index.html, em SPA.
export const prerender = false;

export const load: PageLoad = async ({ params, fetch }) => {
	const id = Number(params.id);
	if (!Number.isFinite(id)) throw error(404, 'Jogo desconhecido');
	try {
		return { ficha: await carregarJogo(id, fetch) };
	} catch {
		throw error(404, 'Não há ficha publicada para este jogo.');
	}
};
