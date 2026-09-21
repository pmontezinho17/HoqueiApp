import type { FicheiroCompeticao, IndiceCompeticoes } from './tipos';

// Mesma origem que a app — sem CORS, e o service worker (W2.9) trata destes pedidos
// com o mesmo mecanismo com que trata o código.
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
