<script lang="ts">
	/**
	 * O rótulo de uma tabela que é nossa.
	 *
	 * Num componente só, e não repetido em três páginas: é um texto que afirma uma coisa
	 * sobre o que publicamos, e três cópias divergiam na primeira vez que uma delas mudasse.
	 *
	 * **Diz o que é, quem a fez e com que regras.** Sem isto, alguém podia citar uma tabela
	 * de Benjamins calculada por nós como se fosse da associação — e a ausência dela no site
	 * da APL é quase certamente deliberada, por ser escolha pedagógica não fazer ranking
	 * competitivo nos escalões mais novos. Publicamos com o rótulo por decisão do dono a
	 * 07/10/2026, com esse travão à frente.
	 */
</script>

<p class="calculada">
	<strong>Classificação não oficial.</strong> A Associação de Patinagem de Lisboa não publica
	tabela neste escalão — esta é calculada por nós a partir dos resultados: vitória 3 pontos,
	empate 1, e o desempate pela diferença de golos.
</p>

<style>
	.calculada {
		margin: 0 0 var(--e-4);
		padding: var(--e-3);
		border-radius: var(--raio);
		border: 1px solid var(--aviso);
		background: var(--aviso-fundo);
		color: var(--aviso);
		font-size: var(--t-micro);
		line-height: 1.45;
	}
	.calculada strong { color: inherit; }
</style>
