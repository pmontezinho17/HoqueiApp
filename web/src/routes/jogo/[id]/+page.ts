import { carregarCompeticao, carregarJogo, carregarMerito, carregarPrejogo } from '$lib/dados';
import { comNomesDaAgenda, fichaDaAgenda } from '$lib/fichaDaAgenda';
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
		// uma ficha de convocatória pode vir sem equipas: ver `comNomesDaAgenda`
		ficha = comNomesDaAgenda(await carregarJogo(id, fetch, aoVivo), naAgenda);
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
	//
	// **E o Mérito ao lado dela, desde 21/10/2026.** Nos Escolares e Benjamins a classificação
	// *é* o Mérito do Artigo 92.º, e esta página não o carregava: quem abria um jogo desses
	// escalões não via separador de classificação nenhum. É o terceiro ecrã da mesma história —
	// a 10/10 o Mérito entrou na competição, a 14/10 apanhou-se a equipa, e a ficha de jogo
	// ficou de fora até o dono a pedir. Medido a 21/10 nas 37 provas publicadas: 8 têm só
	// Mérito, 23 só tabela de pontos, 6 nenhuma das duas e **zero têm as duas**.
	//
	// Os dois pedidos em paralelo: são dois ficheiros no nosso CDN e esperar por um para pedir
	// o outro atrasava a página sem motivo.
	//
	// **E o que se sabia antes do jogo** (#11), antes, durante e depois dele. Até 07/11/2026 só
	// se pedia sem resultado, porque o raspador apagava o ficheiro quando o jogo se jogava; desde
	// esse dia fica, com os números de antes do jogo, por decisão do dono. Um ficheiro em falta
	// — um Torneio Particular, ou um jogo em que nenhuma das equipas tinha jogado — não derruba a
	// página. A agenda primeiro para saber se está por disputar: a ficha de convocatória chega
	// antes do apito com as colunas a zero, e um `0` ali não é resultado nenhum.
	const porDisputar = !aoVivo && (naAgenda ? naAgenda.gc === null : ficha.golos_casa === null);
	const [competicao, merito, prejogo] = await Promise.all([
		ficha.competicao_id ? carregarCompeticao(ficha.competicao_id, fetch).catch(() => null) : null,
		ficha.competicao_id ? carregarMerito(ficha.competicao_id, fetch).catch(() => null) : null,
		carregarPrejogo(id, fetch).catch(() => null)
	]);
	return { ficha, competicao, merito, prejogo, porDisputar, semFicha };
};
