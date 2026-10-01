import { carregarCompeticao, carregarQuadro } from '$lib/dados';
import { slug } from '$lib/slug';
import { error } from '@sveltejs/kit';
import type { EquipaIndice } from '$lib/tipos';
import type { PageLoad } from './$types';

export const prerender = false;

export const load: PageLoad = async ({ params, fetch, parent }) => {
	const { equipas } = await parent();
	const alvo = (equipas as EquipaIndice[]).find(
		(e) => slug(e.categoria) === params.cat && slug(e.equipa) === params.nome
	);
	if (!alvo) throw error(404, 'Equipa desconhecida');

	const provas = await Promise.all(
		alvo.competicoes.map(async (id) => ({
			id,
			dados: await carregarCompeticao(id, fetch),
			quadro: await carregarQuadro(id, fetch).catch(() => null)
		}))
	);
	return { equipa: alvo.equipa, categoria: alvo.categoria, provas };
};
