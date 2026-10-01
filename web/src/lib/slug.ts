/** Slugs estáveis para URLs de equipa. Duas equipas distintas nunca colidem porque a
 *  categoria entra no caminho: /equipa/sub-13/parede-fc-a */
export function slug(texto: string): string {
	return texto
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

export const caminhoEquipa = (equipa: string, categoria: string) =>
	`/equipa/${slug(categoria)}/${slug(equipa)}`;
