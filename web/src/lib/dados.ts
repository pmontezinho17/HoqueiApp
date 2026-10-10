import type { Agenda, FicheiroCompeticao, FicheiroMerito, FichaJogo, IndiceCompeticoes, IndiceEquipas, Meta, Quadro } from './tipos';

import { PRODUCAO, ehSiteDeRamo } from './ambiente.js';

const CAMINHO = '/v1/aplisboa/2026-27';

/**
 * De onde vêm os dados.
 *
 * **Em produção, da própria origem** — sem CORS, e o service worker trata destes pedidos com
 * o mesmo mecanismo com que trata o código.
 *
 * **Num site de ramo, de produção.** Isto mudou a 10/10/2026 e foi a correcção de um
 * problema que mordeu duas vezes no mesmo dia. Um site de ramo publica os dados que estavam
 * commitados quando foi construído, e isso envelhece depressa: às 18:16 desse sábado o site
 * de testes mostrava o CD PAÇO ARCOS B – AE FISICA D B como "por começar" enquanto o jogo ia
 * 2-0 ao intervalo. O dono abriu-o para ver a transmissão e não viu jogo nenhum a decorrer.
 *
 * Ler de produção resolve isso **sem custar um único pedido à APL**: é o nosso próprio CDN,
 * já publicado, e a regra do projecto é uma raspagem central e nunca uma por ambiente. O
 * `hoquei.pages.dev` responde com `access-control-allow-origin: *` — verificado nesse dia.
 *
 * E tem uma segunda virtude, maior do que a primeira: o site de testes passa a diferir de
 * produção **só no código**. Era isso que um ambiente de testes devia ser desde o início, e
 * uma cópia de dados a envelhecer em paralelo nunca foi outra coisa senão uma fonte de
 * enganos.
 *
 * O contador de produção sabe ignorar estes pedidos — ver `oQueContar` no `_middleware.js`,
 * que de outra forma passava a contar o tráfego de testes nos números reais.
 */
function base(): string {
	if (typeof location !== 'undefined' && ehSiteDeRamo(location.hostname)) {
		return `https://${PRODUCAO}${CAMINHO}`;
	}
	return CAMINHO;
}

/**
 * Um erro que distingue "não está publicado" de "não há rede". Os dois precisam de respostas
 * diferentes na interface, e misturá-los fez a app dizer a quem tinha rede perfeita que o
 * problema era da internet dele — ver `fichaDaAgenda.ts`.
 */
export class NaoPublicado extends Error {
	constructor(caminho: string) {
		super(`${caminho} não está publicado`);
		this.name = 'NaoPublicado';
	}
}

/**
 * Lê um ficheiro de dados, com o caminho **relativo à raiz do `/v1`** — `/merito/461.json`.
 *
 * Num site de ramo tenta primeiro em produção, que é o que o torna fresco, e **cai para a
 * cópia local quando produção não tem o ficheiro**. Essa segunda tentativa não é defensiva:
 * é o caso normal de um ambiente de testes. O site de testes leva código novo, e código novo
 * traz ficheiros novos — os do Mérito da Formação existiam lá dias antes de existirem em
 * produção.
 *
 * Sem ela, a 10/10/2026, o separador da classificação dos Escolares ficou **vazio**: o site
 * de testes pedia o Mérito a produção, produção devolvia a página de fallback, e a tabela de
 * vitórias que antes preenchia aquele espaço já tinha sido removida no mesmo dia. Duas
 * mudanças minhas a cruzarem-se.
 */
async function json<T>(sufixo: string, fetchFn: typeof fetch, opcoes?: RequestInit): Promise<T> {
	try {
		return await pedir<T>(`${base()}${sufixo}`, fetchFn, opcoes);
	} catch (e) {
		const local = `${CAMINHO}${sufixo}`;
		if (e instanceof NaoPublicado && base() !== CAMINHO) {
			return pedir<T>(local, fetchFn, opcoes);
		}
		throw e;
	}
}

async function pedir<T>(caminho: string, fetchFn: typeof fetch, opcoes?: RequestInit): Promise<T> {
	const r = await fetchFn(caminho, opcoes);
	if (r.status === 404) throw new NaoPublicado(caminho);
	if (!r.ok) throw new Error(`${r.status} ao carregar ${caminho}`);
	// **Um 200 não prova que o ficheiro existe.** O `adapter-static` serve o `index.html`
	// como fallback para qualquer caminho sem rota, e esse fallback vem com estado 200. Sem
	// esta verificação, o `r.json()` rebentava com um erro de sintaxe e a app concluía
	// "falhou a rede" — quando o que se passava era "este ficheiro não existe".
	//
	// Medido a 09/10/2026 com `match/9864.json`: HTTP 200, 3 750 bytes, a começar em
	// `<!doctype html>`.
	const texto = await r.text();
	if (texto.trimStart().startsWith('<')) throw new NaoPublicado(caminho);
	return JSON.parse(texto) as T;
}

export const carregarIndice = (f: typeof fetch) =>
	json<IndiceCompeticoes>(`/competitions.json`, f);

/** Moradas dos recintos: a fonte só publica o nome, que não geocodifica. */
export const carregarRecintos = (f: typeof fetch) =>
	json<{ recintos: Record<string, string> }>(`/recintos.json`, f);

export const carregarCompeticao = (id: number, f: typeof fetch) =>
	json<FicheiroCompeticao>(`/comp/${id}.json`, f);

/**
 * A ficha de um jogo. Com `aoVivo`, salta **todas** as caches.
 *
 * Porquê: a lista e a ficha são dois ficheiros com duas caches independentes de 20 s. Entrar
 * num jogo a partir de uma lista que já dizia 2–1 e ver 1–0 é isso — a ficha vinha de uma
 * cópia guardada momentos antes. Num jogo a decorrer, a frescura vale mais do que a cache;
 * fora disso a cache fica intacta, que é o que faz a app abrir sem rede.
 */
export const carregarJogo = (id: number, f: typeof fetch, aoVivo = false) =>
	// `no-cache` revalida sempre com o servidor, mas mantém o mesmo URL — ao contrário de
	// um `?v=` por pedido, que encheria a cache do service worker com uma entrada nova de
	// 30 em 30 segundos durante um jogo.
	json<FichaJogo>(`/match/${id}.json`, f, aoVivo ? { cache: 'no-cache' } : undefined);

export const carregarQuadro = (comp: number, f: typeof fetch) =>
	json<Quadro>(`/scorers/${comp}.json`, f);

/**
 * A tabela de Mérito da Formação de uma prova. Só existe nos Encontros Distritais de
 * Escolares e Benjamins — em todas as outras dá `NaoPublicado`, e isso não é um erro.
 */
export const carregarMerito = (comp: number, f: typeof fetch) =>
	json<FicheiroMerito>(`/merito/${comp}.json`, f);

/** nome da equipa → caminho do emblema na nossa origem */
export const carregarEmblemas = (f: typeof fetch) =>
	json<Record<string, string>>(`/emblemas.json`, f);

/**
 * A agenda. Com `aoVivo`, salta **todas** as caches — pela mesma razão que a ficha.
 *
 * E isto é mais apertado do que parece: `/v1/*` é servido com
 * `max-age=20, stale-while-revalidate=600`, e o que essa segunda metade autoriza é a cache
 * do browser a responder **de imediato com uma cópia de até dez minutos** enquanto vai
 * buscar a nova por trás. O `AutoRefrescar` já pedia a agenda de 30 em 30 segundos; era a
 * cache que lhe devolvia sempre a de antes.
 *
 * Deu nisto, a 05/10 às 19:08: o PAREDE FC B–CACO B estava 1–0 na ficha, com o golo aos 4'
 * na cronologia, e a lista de jogos dizia 0–0 — com o relógio a andar, o que torna a
 * mentira pior, porque parece fresca. A ficha ia à rede; a lista não.
 */
export const carregarAgenda = (f: typeof fetch, aoVivo = false) =>
	json<Agenda>(`/agenda.json`, f, aoVivo ? { cache: 'no-cache' } : undefined);

export const carregarEquipas = (f: typeof fetch) =>
	json<IndiceEquipas>(`/teams.json`, f);

/** A hora dos dados. É ela que escreve o "agora mesmo" no cabeçalho, por isso vir de uma
 *  cópia velha é a app a dizer que está fresca quando não está. */
export const carregarMeta = (f: typeof fetch, aoVivo = false) =>
	json<Meta>(`/meta.json`, f, aoVivo ? { cache: 'no-cache' } : undefined);
