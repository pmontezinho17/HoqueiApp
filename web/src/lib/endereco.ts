import { goto } from '$app/navigation';

/**
 * Guardar no endereço o que se escolheu num ecrã — a aba, a série —, de forma a que a seta de
 * voltar o devolva.
 *
 * ## Porque não o `replaceState` do `$app/navigation`
 *
 * Era o que a página da equipa usava, e o endereço à vista mudava. Mas é encaminhamento
 * *superficial*: o SvelteKit guarda na entrada da história o `page.url` que tinha **antes** —
 * ver o `PAGE_URL_KEY` no `client.js` (2.70.3) — e, ao voltar, navega para esse. Medido a
 * 31/10/2026 no servidor de desenvolvimento: na página do SC TOMAR, escolher Jogos, abrir um jogo
 * e voltar dava `?aba=resumo`; no ecrã dos Sub-17, a série D voltava como "Todas". A promessa
 * do `voltar.ts` — *"com os separadores como os deixou"* — não se cumpria em nenhum dos dois.
 *
 * Um `goto` que substitui a entrada é uma navegação a sério: o `page.url` passa a ser o novo,
 * e é esse que a história guarda. Nenhum `load` destes ecrãs lê a pesquisa do endereço, por
 * isso não se volta a pedir dados nenhuns.
 */
export function guardarNoEndereco(u: URL): Promise<void> {
	return goto(u, { replaceState: true, noScroll: true, keepFocus: true });
}
