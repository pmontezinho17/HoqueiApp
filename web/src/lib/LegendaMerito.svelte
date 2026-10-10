<script lang="ts">
	/**
	 * As regras do Artigo 92.º e as duas ressalvas, uma vez por ecrã.
	 *
	 * Fechada por omissão: são cinco colunas e quatro parágrafos, e quem já sabe o que está a
	 * ver não precisa de rolar por cima deles de cada vez. Quem não sabe tem o `ChapeuMerito`
	 * em cima, que é a parte que não se pode esconder.
	 */
	let {
		porConfirmar = 0,
		semBoletim = 0
	}: {
		/** jogos onde há uma penalização que depende de algo que o boletim não mostra */
		porConfirmar?: number;
		/** jogos disputados cujo boletim a fonte não publicou */
		semBoletim?: number;
	} = $props();
</script>

<details class="legenda">
	<summary>Como estes pontos são calculados</summary>
	<dl>
		<dt>J</dt><dd>Jogos com boletim oficial publicado — não necessariamente todos os que a equipa jogou.</dd>
		<dt>B</dt><dd>Bonificações: 1 por cada atleta que entrou em jogo, 3 a quem marcou mais golos (1 a cada uma no empate) e 1 pela equipa completa, com 2 guarda-redes e 8 jogadores de campo.</dd>
		<dt>Pen</dt><dd>Penalizações: menos de 8 atletas, um só guarda-redes, e atletas a fazer três meias partes ou as quatro. O regulamento parte estes jogos em quatro meias partes e obriga a que cada atleta faça uma inteira de cada parte.</dd>
		<dt>Méd</dt><dd>Pontos por jogo. As equipas não jogam todas o mesmo número de jogos, e a soma sozinha enganaria.</dd>
		<dt>P</dt><dd>A soma de todos os jogos, que é como o Artigo 92.º manda escalonar.</dd>
	</dl>
	<p>
		Tabela <strong>não oficial</strong>. A pontuação oficial é preenchida pelos delegados na
		Folha de Controlo de Jogo, em papel, e validada pelo Comité Técnico da associação — onde
		as duas discordarem, a oficial é a que manda. <a href="/mais">Como a calculamos</a>.
	</p>
	{#if porConfirmar > 0}
		<p>
			{porConfirmar}
			{porConfirmar === 1 ? 'jogo tem' : 'jogos têm'} uma penalização por confirmar: um atleta
			fez um só período, e o regulamento não penaliza isso quando houve lesão comprovada pelo
			árbitro. Essa justificação é escrita no boletim em papel e não aparece aqui, por isso
			não a descontámos.
		</p>
	{/if}
	{#if semBoletim > 0}
		<p>
			{semBoletim}
			{semBoletim === 1 ? 'jogo disputado não tem' : 'jogos disputados não têm'} boletim
			publicado pela associação, e por isso {semBoletim === 1 ? 'não conta' : 'não contam'}
			nesta tabela.
		</p>
	{/if}
</details>

<style>
	.legenda { margin-top: 0.6rem; font-size: 0.76rem; }
	summary { min-height: 44px; display: flex; align-items: center; cursor: pointer;
		color: var(--acento); font-size: 0.74rem; }
	.legenda dl { display: grid; grid-template-columns: 2.6rem 1fr; gap: 0.25rem 0.6rem;
		margin: 0.2rem 0 0.5rem; }
	.legenda dt { font-weight: 700; font-size: 0.72rem; }
	.legenda dd { margin: 0; font-size: 0.74rem; color: var(--suave); line-height: 1.4; }
	.legenda p { margin: 0 0 0.4rem; font-size: 0.7rem; color: var(--suave); line-height: 1.45; }
	.legenda p strong { font-weight: 600; color: var(--texto-2); }
	.legenda a { color: var(--suave); text-decoration: underline; }
</style>
