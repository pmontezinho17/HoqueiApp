<script lang="ts">
	/**
	 * O crachá de um escalão.
	 *
	 * Os onze SVG estão em `static/escaloes/` desde 05/10/2026 e nunca tinham saído de lá.
	 * Isto é o que lhes dá uso — primeiro no herói da ficha de jogo (08/10), onde o dono não
	 * encontrava o escalão, e depois no menu de Competições (P12.2).
	 *
	 * **A lista de escalões conhecidos está aqui por escrito e não é um palpite sobre o
	 * ficheiro existir.** Um `<img>` para um ficheiro que não existe dá um ícone partido no
	 * meio do cabeçalho; um escalão que a fonte invente amanhã não desenha nada e a app
	 * continua inteira.
	 */
	import { slug } from './slug';

	const CONHECIDOS = new Set([
		'bambis', 'benjamins', 'escolares', 'seniores-femininos', 'seniores-masculinos',
		'sub-13', 'sub-15', 'sub-17', 'sub-19', 'sub-23', 'torneios-particulares'
	]);

	let { categoria, tamanho = 18 }: { categoria: string | null | undefined; tamanho?: number } =
		$props();

	const nome = $derived(categoria ? slug(categoria) : '');
	const ha = $derived(CONHECIDOS.has(nome));
</script>

{#if ha}
	<!-- decorativo: o nome do escalão vai sempre a seguir, em texto -->
	<img src={`/escaloes/${nome}.svg`} width={tamanho} height={tamanho} alt="" aria-hidden="true" />
{/if}

<style>
	img { display: block; flex: 0 0 auto; }
</style>
