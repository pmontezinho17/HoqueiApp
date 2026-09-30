import { carregarCompeticao, carregarQuadro } from '$lib/dados';
import { error } from '@sveltejs/kit';
import type { Competicao } from '$lib/tipos';
import type { PageLoad } from './$types';

export const prerender = false;

/** Carrega todas as séries do grupo. São no máximo 6 ficheiros. */
export const load: PageLoad = async ({ params, fetch, parent }) => {
	const { indice } = await parent();
	const series = (indice.competicoes as Competicao[]).filter(
		(c) => (c.grupo_id ?? String(c.id)) === params.grupo
	);
	if (!series.length) throw error(404, 'Competição desconhecida');

	const provas = await Promise.all(
		series.map(async (c) => ({
			competicao: c,
			dados: await carregarCompeticao(c.id, fetch),
			quadro: await carregarQuadro(c.id, fetch).catch(() => null)
		}))
	);
	return {
		grupoNome: series[0].grupo_nome ?? series[0].nome,
		escalao: series[0].categoria,
		provas
	};
};
