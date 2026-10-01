import { carregarCompeticao, carregarQuadro } from '$lib/dados';
import { slug } from '$lib/slug';
import { error } from '@sveltejs/kit';
import type { EquipaIndice } from '$lib/tipos';
import type { PageLoad } from './$types';

export const prerender = false;

export const load: PageLoad = async ({ params, fetch, parent }) => {
	const { equipas, indice } = await parent();
	const alvo = (equipas as EquipaIndice[]).find(
		(e) => slug(e.categoria) === params.cat && slug(e.equipa) === params.nome
	);
	if (!alvo) throw error(404, 'Equipa desconhecida');

	// O agrupamento por série só existe no índice; `comp/{id}.json` traz os campos a null.
	// Copiamo-los para aqui para os rótulos e os links apontarem ao grupo, não à série solta.
	const provas = await Promise.all(
		alvo.competicoes.map(async (id) => {
			const dados = await carregarCompeticao(id, fetch);
			const no = indice.competicoes.find((c) => c.id === id);
			if (no) dados.competicao = { ...dados.competicao, ...no };
			return { id, dados, quadro: await carregarQuadro(id, fetch).catch(() => null) };
		})
	);
	return { equipa: alvo.equipa, categoria: alvo.categoria, provas };
};
