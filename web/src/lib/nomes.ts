/**
 * Nomes de clube e escalão em caixa de título, para o que sai da app.
 *
 * Gémeo de `scraper/src/hoquei/nomes.py` — os dois têm de dar o mesmo, porque o mesmo jogo
 * aparece no feed `.ics` (gerado em Python) e nos links de evento do Google (gerados aqui).
 * A lista de siglas foi levantada dos 88 nomes de equipa reais da APL.
 */

const SIGLAS = new Set([
	'AA', 'AD', 'AE', 'APAC', 'CD', 'CF', 'CP', 'FC', 'GD', 'GDS', 'GRF', 'HC', 'HCM',
	'IR', 'SC', 'SL', 'UD', 'UF', 'FSE/AJ'
]);

const capitalizar = (p: string, separadores: RegExp) =>
	p.toLowerCase().replace(separadores, (_, antes, letra) => antes + letra.toUpperCase());

function palavra(p: string): string {
	if (SIGLAS.has(p.toUpperCase())) return p.toUpperCase();
	// sufixos de equipa (A, B) e códigos entre parênteses — (B), (S13), (SF)
	if (p.length === 1 || p.startsWith('(')) return p.toUpperCase();
	// sigla desconhecida e curta fica como está: mais vale isso do que "APAC" virar "Apac"
	if (p.length <= 3 && p === p.toUpperCase()) return p;
	return capitalizar(p, /(^|[-/'])(\p{L})/gu);
}

/** `CD PAÇO ARCOS B` → `CD Paço Arcos B` */
export const clube = (nome: string) => nome.split(/\s+/).map(palavra).join(' ');

/** `SUB-13` → `Sub-13`; `SENIORES MASCULINOS` → `Seniores Masculinos` */
export const escalao = (nome: string) =>
	nome.split(/\s+/).map((p) => capitalizar(p, /(^|-)(\p{L})/gu)).join(' ');
