import {
	carregarAgenda,
	carregarEmblemas,
	carregarEquipas,
	carregarIndice,
	carregarMeta,
	carregarRecintos
} from '$lib/dados';
import { juntarFontes, type IndicesDeUmaFonte } from '$lib/fontes';
import type { LayoutLoad } from './$types';

export const prerender = true;
export const ssr = false;

/**
 * O primeiro carregamento vem da cache; os seguintes vêm da rede.
 *
 * Esta variável vive no módulo, logo dura enquanto a app estiver aberta. Serve para
 * distinguir o arranque — onde a cache é o que faz a app abrir num pavilhão com 3G mau, e
 * até sem rede nenhuma — de um refrescamento do `AutoRefrescar`, onde a cache é
 * exactamente o que não se quer: a agenda é servida com `stale-while-revalidate=600` e
 * responderia com uma cópia de até dez minutos sem ir à rede.
 */
let arrancou = false;

/** Tudo o que é transversal aos ecrãs, num só lote. Os ficheiros são pequenos e a cache
 *  do service worker serve-os de imediato nas visitas seguintes. */
export const load: LayoutLoad = async ({ fetch }) => {
	const refrescar = arrancou;
	const [indice, meta, emblemas, equipas, agenda, recintos, fpp] = await Promise.all([
		carregarIndice(fetch),
		carregarMeta(fetch, refrescar),
		carregarEmblemas(fetch).catch(() => ({}) as Record<string, string>),
		carregarEquipas(fetch).then((r) => r.equipas).catch(() => []),
		carregarAgenda(fetch, refrescar).then((r) => r.jogos),
		carregarRecintos(fetch)
			.then((r) => r.recintos)
			.catch(() => ({}) as Record<string, string>),
		ligasNacionais(fetch, refrescar)
	]);
	arrancou = true;
	const juntos = juntarFontes({ competicoes: indice.competicoes, agenda, equipas, emblemas }, fpp);
	return {
		indice: { ...indice, competicoes: juntos.competicoes },
		meta,
		emblemas: juntos.emblemas,
		equipas: juntos.equipas,
		agenda: juntos.agenda,
		recintos
	};
};

/**
 * As ligas nacionais (`docs/11-ligas-nacionais.md`), ao lado da APL e **sem a poder estragar**:
 * qualquer falha dá `null`, e a app abre só com a APL. O `meta` da FPP não se lê aqui — a hora
 * no cabeçalho continua a ser a da APL, que é a fonte que corre todos os dias.
 */
async function ligasNacionais(f: typeof fetch, refrescar: boolean): Promise<IndicesDeUmaFonte | null> {
	try {
		const [indice, agenda, equipas, emblemas] = await Promise.all([
			carregarIndice(f, 'fpp'),
			carregarAgenda(f, refrescar, 'fpp'),
			carregarEquipas(f, 'fpp').catch(() => ({ equipas: [] })),
			carregarEmblemas(f, 'fpp').catch(() => ({}) as Record<string, string>)
		]);
		return { competicoes: indice.competicoes, agenda: agenda.jogos, equipas: equipas.equipas, emblemas };
	} catch {
		return null;
	}
}
