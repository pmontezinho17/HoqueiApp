<script lang="ts">
	/**
	 * As regras do Artigo 92.º numa tabela, e não em prosa.
	 *
	 * O dono pediu *"alguma forma de perceber o sistema de regras"* e deixou três hipóteses em
	 * aberto: uma página nova, uma tabela, ou um separador só para estes escalões. Fica a
	 * tabela, **dentro do mesmo separador onde estão os pontos**, e por uma razão concreta: a
	 * pergunta "porque é que esta equipa tem -8?" nasce a olhar para o -8. Mandá-la a outra
	 * página obriga a sair, ler e voltar, e a maior parte das pessoas não volta.
	 *
	 * Um separador próprio tinha o mesmo defeito com um clique a menos, e um separador que
	 * não muda nunca ocupa espaço permanente no topo para uma coisa que se lê uma vez.
	 *
	 * Dobrada por omissão: quem já sabe não tropeça nela todas as vezes. A explicação por
	 * extenso — e as duas aproximações que fazemos — vive em "Sobre a app e os dados".
	 */
	const GANHA: [string, string][] = [
		['+1', 'por cada atleta que entra em jogo'],
		['+3', 'à equipa que marca mais golos'],
		['+1', 'a cada uma, se o jogo acabar empatado'],
		['+1', 'pela equipa completa: 2 guarda-redes e 8 jogadores de campo']
	];
	const PERDE: [string, string][] = [
		['−1', 'apresentar menos de 8 atletas'],
		['−1', 'levar um só guarda-redes'],
		['−1', 'por cada atleta que faça três meias partes'],
		['−2', 'a mais, se essas três forem seguidas e a equipa tiver mais de 8 atletas'],
		['−4', 'por cada atleta que faça as quatro meias partes'],
		['−10', 'falta de comparência']
	];
</script>

<details class="regras">
	<summary>Como se contam estes pontos</summary>

	<p class="intro">
		O jogo destes escalões tem <strong>quatro meias partes</strong>, e o regulamento obriga
		cada atleta a fazer uma inteira em cada parte. É isso que estes pontos medem: não quem
		ganha, mas quem leva a equipa toda e a põe a jogar.
	</p>

	<table>
		<tbody>
			<tr class="cabeca"><th colspan="2" scope="colgroup">Ganha pontos</th></tr>
			{#each GANHA as [valor, texto] (texto)}
				<tr><td class="v mais">{valor}</td><td>{texto}</td></tr>
			{/each}
			<tr class="cabeca"><th colspan="2" scope="colgroup">Perde pontos</th></tr>
			{#each PERDE as [valor, texto] (texto)}
				<tr><td class="v menos">{valor}</td><td>{texto}</td></tr>
			{/each}
		</tbody>
	</table>

	<p class="exemplo">
		<strong>Um exemplo real.</strong> A 10 de Outubro o Sporting ganhou 18–0 nos Benjamins e
		ficou com <b class="menos">−8</b>: levou 6 atletas, só 4 de campo, e como em pista estão
		4 de campo os quatro tiveram de fazer as quatro meias partes. O adversário perdeu 18–0 e
		fez <b class="mais">+11</b>: levou 10 e pôs todos a jogar.
	</p>

	<p class="nota">
		Tabela <strong>não oficial</strong>. A pontuação que conta é preenchida pelos delegados
		em papel e validada pelo Comité Técnico da associação.
		<a href="/mais">O que não conseguimos calcular</a>.
	</p>
</details>

<style>
	.regras { margin-top: var(--e-3); }
	summary {
		min-height: 44px;
		display: flex;
		align-items: center;
		cursor: pointer;
		color: var(--acento);
		font-size: var(--t-micro);
		font-weight: 600;
	}
	.intro { margin: 0 0 var(--e-3); font-size: var(--t-micro); color: var(--suave);
		line-height: 1.5; }
	.intro strong { color: var(--texto-2); font-weight: 600; }

	table { width: 100%; border-collapse: collapse; font-size: var(--t-micro); }
	.cabeca th {
		text-align: left;
		padding: var(--e-2) 0 var(--e-1);
		font-size: 0.64rem;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--suave);
		font-weight: 600;
	}
	td { padding: 0.3rem 0; vertical-align: top; line-height: 1.4; color: var(--texto-2); }
	/* a coluna dos valores com largura fixa: sem isso o `−10` empurrava a coluna do texto e
	   as linhas deixavam de alinhar umas com as outras */
	.v { width: 2.2rem; font-weight: 700; font-variant-numeric: tabular-nums; }
	.mais { color: var(--acento); }
	.menos { color: var(--directo); }

	.exemplo, .nota {
		margin: var(--e-3) 0 0;
		font-size: var(--t-micro);
		color: var(--suave);
		line-height: 1.5;
	}
	.exemplo strong, .nota strong { color: var(--texto-2); font-weight: 600; }
	.nota a { color: var(--suave); text-decoration: underline; }
</style>
