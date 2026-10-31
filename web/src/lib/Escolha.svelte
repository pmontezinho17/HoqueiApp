<script lang="ts" generics="T">
	/**
	 * Uma lista nativa, em pílula, para os filtros que ficam lado a lado por cima de uma lista.
	 *
	 * **Nativa de propósito:** num telemóvel um `<select>` abre a roda do sistema, que é maior,
	 * mais rápida e mais acessível do que qualquer lista que eu desenhe — e não traz um único
	 * byte de JavaScript.
	 *
	 * **Um componente, e não um estilo copiado.** Nasceu nos filtros da lista de jogos (escalão
	 * e agrupar, meia largura cada); a 31/10/2026 o dono pediu o mesmo na classificação de uma
	 * competição — *"tal como foi feito no menu de jogos, vamos simplificar esta parte, mantendo
	 * o filtro das séries e a visualização das tabelas, mais pequeno e lado a lado"*. Duas
	 * cópias do mesmo CSS são duas cópias a divergir à próxima alteração, que foi o que tinha
	 * acontecido aos separadores.
	 *
	 * Quem a põe ao lado de outra dá-lhe o contentor (`display: flex`, ver a lista de jogos);
	 * cada uma ocupa metade.
	 */
	let {
		rotulo,
		opcoes,
		valor = $bindable()
	}: {
		/** o que se ouve por voz — a lista mostra só a opção escolhida */
		rotulo: string;
		opcoes: { valor: T; rotulo: string }[];
		valor: T;
	} = $props();
</script>

<label>
	<span class="sr">{rotulo}</span>
	<select bind:value={valor}>
		{#each opcoes as o (o.valor)}
			<option value={o.valor}>{o.rotulo}</option>
		{/each}
	</select>
</label>

<style>
	label { flex: 1 1 0; min-width: 0; }
	select {
		width: 100%;
		min-height: 40px;
		padding: 0 var(--e-2);
		font-size: var(--t-micro);
		font-family: inherit;
		cursor: pointer;
		border-radius: var(--raio-pilula);
		border: 1px solid var(--borda);
		background: var(--cartao);
		color: var(--texto-2);
	}
	select:focus-visible { outline: 2px solid var(--acento); outline-offset: 2px; }
</style>
