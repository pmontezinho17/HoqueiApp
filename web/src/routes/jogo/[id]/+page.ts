import { carregarCompeticao, carregarJogo } from '$lib/dados';
import { fichaDaAgenda } from '$lib/fichaDaAgenda';
import { emCurso } from '$lib/formato';
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

// Não pré-renderizável: há uma ficha por jogo e vão nascendo todas as semanas.
// O adapter-static serve estas rotas pelo fallback index.html, em SPA.
export const prerender = false;

/**
 * A ficha de um jogo, **com ou sem ficha publicada**.
 *
 * A fonte só publica a ficha quando o jogo começa, e até 09/10/2026 isto atirava um 404 nesse
 * caso: a página de erro dizia "verifica a ligação à internet" a quem estava a tentar ver um
 * jogo que ainda não começou. Nenhum dos 76 jogos do fim de semana de 10–11/10 tinha ficha.
 *
 * Agora, se a ficha não estiver publicada, monta-se uma a partir da agenda — que já traz as
 * equipas, a hora, o recinto, a prova e o id da competição. O raciocínio e o que isto cobre
 * está em `lib/fichaDaAgenda.ts`.
 *
 * **Só é erro quando o jogo não existe em sítio nenhum.** Um id inventado continua a dar 404,
 * que é o que deve dar.
 */
export const load: PageLoad = async ({ params, fetch, parent }) => {
	const id = Number(params.id);
	if (!Number.isFinite(id)) throw error(404, 'Este endereço não é de um jogo.');

	// A agenda já diz quais os jogos a decorrer; num desses a ficha tem de vir da rede e
	// não de uma cópia de 20 s atrás, senão entra-se num jogo que a lista dava 2–1 e vê-se 1–0.
	const { agenda } = await parent();
	const naAgenda = agenda.find((j) => j.id === id) ?? null;
	const aoVivo = !!naAgenda && emCurso(naAgenda);

	let ficha = null;
	let semFicha = false;
	try {
		ficha = await carregarJogo(id, fetch, aoVivo);
	} catch {
		// Qualquer falha a buscar a ficha, e não só a de "não publicada": sem rede, com a
		// agenda em cache, mais vale a página do jogo com o que já se sabe do que um erro.
		// Nem ficha nem entrada na agenda: o jogo não existe nesta época. Aqui o 404 é a
		// resposta certa, e a página de erro já não fala de internet num 404.
		if (!naAgenda) throw error(404, 'Este jogo não existe na época em curso.');
		ficha = fichaDaAgenda(naAgenda);
		semFicha = true;
	}

	// A classificação da prova, para o separador homónimo. Vem num segundo pedido e **não**
	// pode derrubar a página: há provas sem tabela publicada — todos os Escolares e
	// Benjamins, por exemplo — e aí o separador simplesmente não aparece.
	const competicao = ficha.competicao_id
		? await carregarCompeticao(ficha.competicao_id, fetch).catch(() => null)
		: null;
	return { ficha, competicao, semFicha };
};
