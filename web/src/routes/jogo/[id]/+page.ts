import { carregarJogo } from '$lib/dados';
import { emCurso } from '$lib/formato';
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

// Não pré-renderizável: há uma ficha por jogo e vão nascendo todas as semanas.
// O adapter-static serve estas rotas pelo fallback index.html, em SPA.
export const prerender = false;

export const load: PageLoad = async ({ params, fetch, parent }) => {
	const id = Number(params.id);
	if (!Number.isFinite(id)) throw error(404, 'Jogo desconhecido');
	// A agenda já diz quais os jogos a decorrer; num desses a ficha tem de vir da rede e
	// não de uma cópia de 20 s atrás, senão entra-se num jogo que a lista dava 2–1 e vê-se 1–0.
	const { agenda } = await parent();
	const aoVivo = agenda.some((j) => j.id === id && emCurso(j));
	try {
		return { ficha: await carregarJogo(id, fetch, aoVivo) };
	} catch {
		throw error(404, 'Não há ficha publicada para este jogo.');
	}
};
