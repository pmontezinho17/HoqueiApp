import type { Agenda, FicheiroCompeticao, FichaJogo, IndiceCompeticoes, IndiceEquipas, Meta, Quadro } from './tipos';

// Mesma origem que a app — sem CORS, e o service worker trata destes pedidos com o
// mesmo mecanismo com que trata o código.
const BASE = '/v1/aplisboa/2026-27';

async function json<T>(caminho: string, fetchFn: typeof fetch, opcoes?: RequestInit): Promise<T> {
	const r = await fetchFn(caminho, opcoes);
	if (!r.ok) throw new Error(`${r.status} ao carregar ${caminho}`);
	return (await r.json()) as T;
}

export const carregarIndice = (f: typeof fetch) =>
	json<IndiceCompeticoes>(`${BASE}/competitions.json`, f);

/** Moradas dos recintos: a fonte só publica o nome, que não geocodifica. */
export const carregarRecintos = (f: typeof fetch) =>
	json<{ recintos: Record<string, string> }>(`${BASE}/recintos.json`, f);

export const carregarCompeticao = (id: number, f: typeof fetch) =>
	json<FicheiroCompeticao>(`${BASE}/comp/${id}.json`, f);

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
	json<FichaJogo>(`${BASE}/match/${id}.json`, f, aoVivo ? { cache: 'no-cache' } : undefined);

export const carregarQuadro = (comp: number, f: typeof fetch) =>
	json<Quadro>(`${BASE}/scorers/${comp}.json`, f);

/** nome da equipa → caminho do emblema na nossa origem */
export const carregarEmblemas = (f: typeof fetch) =>
	json<Record<string, string>>(`${BASE}/emblemas.json`, f);

export const carregarAgenda = (f: typeof fetch) =>
	json<Agenda>(`${BASE}/agenda.json`, f);

export const carregarEquipas = (f: typeof fetch) =>
	json<IndiceEquipas>(`${BASE}/teams.json`, f);

export const carregarMeta = (f: typeof fetch) => json<Meta>(`${BASE}/meta.json`, f);
