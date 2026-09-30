import type { Agenda, FicheiroCompeticao, FichaJogo, IndiceCompeticoes, IndiceEquipas, Meta, Quadro } from './tipos';

// Mesma origem que a app — sem CORS, e o service worker trata destes pedidos com o
// mesmo mecanismo com que trata o código.
const BASE = '/v1/aplisboa/2026-27';

async function json<T>(caminho: string, fetchFn: typeof fetch): Promise<T> {
	const r = await fetchFn(caminho);
	if (!r.ok) throw new Error(`${r.status} ao carregar ${caminho}`);
	return (await r.json()) as T;
}

export const carregarIndice = (f: typeof fetch) =>
	json<IndiceCompeticoes>(`${BASE}/competitions.json`, f);

export const carregarCompeticao = (id: number, f: typeof fetch) =>
	json<FicheiroCompeticao>(`${BASE}/comp/${id}.json`, f);

export const carregarJogo = (id: number, f: typeof fetch) =>
	json<FichaJogo>(`${BASE}/match/${id}.json`, f);

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
