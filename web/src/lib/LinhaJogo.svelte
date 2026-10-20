<script lang="ts">
	import Emblema from './Emblema.svelte';
	import Icone from './Icone.svelte';
	import { directoDe } from './directos';
	import { emCurso, escalaoCurto, faseCurta } from './formato';
	import { piscar } from './piscar';
	import { saidasDaLinha } from './destinos';
	import type { JogoAgenda } from './tipos';

	let {
		jogo, emblemas, seguida, comData = false, comEscalao = false
	}: {
		jogo: JogoAgenda;
		emblemas: Record<string, string>;
		seguida?: (equipa: string) => boolean;
		/** numa lista agrupada por dia a data é redundante; numa lista corrida é essencial */
		comData?: boolean;
		/** idem para o escalão: nas secções por competição vive no cabeçalho, mas as listas
		 *  agregadas — "a decorrer agora", "as minhas equipas" — misturam escalões e sem
		 *  isto não se sabe se o 11-5 é de benjamins ou de seniores */
		comEscalao?: boolean;
	} = $props();

	const jogado = $derived(jogo.gc !== null && jogo.gf !== null);
	const live = $derived(emCurso(jogo));
	/**
	 * Há transmissão deste jogo?
	 *
	 * **Aparece mesmo antes de o jogo começar**, e isso é deliberado: quem vê a lista de
	 * sábado de manhã quer saber a qual é que pode assistir à distância, e saber isso depois
	 * do apito inicial já é tarde para decidir se vai ao pavilhão.
	 */
	const directo = $derived(directoDe(jogo.id));
	const ganhouCasa = $derived(jogado && jogo.gc! > jogo.gf!);
	const ganhouFora = $derived(jogado && jogo.gf! > jogo.gc!);
	// As saídas desta linha vivem no `lib/destinos.ts`, não aqui: a pergunta "esta linha leva a
	// algum lado?" tem de ser testável sem montar o componente, e foi por não o ser que um jogo
	// por disputar ficou quatro semanas sem saída nenhuma. Ver lá o porquê completo.
	// **Um alvo por linha**: ou abre o jogo, ou dá as equipas, nunca as duas coisas. A razão é do
	// dono e está no `saidasDaLinha`, com a medição que lhe dá razão.
	const saidas = $derived(saidasDaLinha(jogo));
	const destino = $derived(saidas.jogo);
	const casaEm = $derived(saidas.casa);
	const foraEm = $derived(saidas.fora);

	const diaCurto = (iso: string) => {
		const d = new Date(`${iso}T00:00:00`);
		return `${d.getDate()}/${d.getMonth() + 1}`;
	};
</script>

<!--
  Equipas empilhadas, uma por linha, e não lado a lado.

  O desenho simétrico — `casa | resultado | fora` — dá **metade** da largura a cada nome, e
  com nomes portugueses isso não chega: medido, 15 dos 34 nomes de um domingo apareciam
  cortados, `UD VILAFRANQUENSE B` como `UD VILAFR…`. Empilhadas, cada nome tem a largura
  toda e o problema desaparece de vez em vez de se adiar com meio rem aqui e ali.

  É também o que a theScore e a Sofascore fazem, e por isso é que os nomes delas cabem
  sempre. O custo é a linha passar de ~44px para ~56px — exactamente a altura que medimos
  nas duas (ver docs/04-benchmarking.md).
-->
<!--
  **Ou a linha abre o jogo, ou as equipas são alcançáveis — nunca as duas coisas.**

  Houve uma versão desta linha, a 20/10/2026, em que as duas coisas coexistiam: a linha tinha
  um link a cobri-la e as equipas por cima dele. O dono parou-a no site de testes: *"neste
  menu, não quero que os clubes sejam clicáveis, pois cada vez que quero abrir o jogo posso
  sem querer carregar em cima do nome clube e abrir o clube ao invés do jogo"*.

  Tinha razão, e os dados dão-lhe razão: **nenhuma das cinco sugestões que pediam o emblema
  clicável foi escrita na lista de jogos** — vieram de `/jogo/…`, de `/clube` e de `/equipa/…`.
  Numa lista de jogos o que se quer é abrir o jogo, e eu tinha posto lá um segundo alvo que
  ninguém pediu.

  Com a regra, o `<a>` dentro de `<a>` deixa de ser possível por construção, e por isso o link
  que cobria a linha desapareceu: ela volta a ser um link inteiro quando abre o jogo.
-->
<svelte:element this={destino ? 'a' : 'div'} href={destino} class="linha"
	class:ligavel={destino} class:comDirecto={!!directo}>
	<span class="quando">
		{#if live}
			<!-- O ponto a pulsar lê-se antes do texto; o texto é para quem não vê cor.
			     E o texto é a fase do jogo, não "AO VIVO": a cor e o ponto já dizem que
			     está a decorrer, e o que não se sabia era se ia no início ou no fim — era
			     isso que decidia se valia a pena entrar. Sem fase nos dados (ficheiro
			     antigo, ou ronda que não chegou a escrevê-la) volta a "AO VIVO". -->
			<span class="vivo"><i aria-hidden="true"></i>{faseCurta(jogo) ?? 'AO VIVO'}</span>
			{#if jogo.relogio}<span class="conta">{jogo.relogio}</span>{/if}
		{:else}
			{#if comData && jogo.data}<span class="dia">{diaCurto(jogo.data)}</span>{/if}
			<span class="hora">{jogo.hora ?? '—'}</span>
		{/if}
		{#if comEscalao}<span class="escalao">{escalaoCurto(jogo.cat)}</span>{/if}
	</span>

	<span class="equipas">
		<svelte:element this={casaEm ? 'a' : 'span'} href={casaEm} class="equipa"
			class:vencedor={ganhouCasa} class:minha={seguida?.(jogo.casa)}>
			<Emblema equipa={jogo.casa} src={emblemas[jogo.casa]} tamanho={18} />
			<span class="nome">{jogo.casa}</span>
		</svelte:element>
		<svelte:element this={foraEm ? 'a' : 'span'} href={foraEm} class="equipa"
			class:vencedor={ganhouFora} class:minha={seguida?.(jogo.fora)}>
			<Emblema equipa={jogo.fora} src={emblemas[jogo.fora]} tamanho={18} />
			<span class="nome">{jogo.fora}</span>
		</svelte:element>
	</span>

	{#if directo}
		<!-- **Entre as equipas e o resultado, e em vermelho.** Estava debaixo do escalão, na
		     coluna da hora, e o dono apanhou-o a 10/10/2026: *"está muito escondido"*. Tinha
		     razão por duas razões ao mesmo tempo — era pequeno e estava num canto onde já
		     vivem três linhas de texto, e era da cor do `--vivo`, que numa janela com sete
		     jogos a decorrer está em todos. Aqui está no caminho do olho, que vai do nome da
		     equipa ao resultado, e a cor só quer dizer uma coisa. -->
		<span class="camara" title="com transmissão em directo ({directo.fonte})">
			<Icone nome="directo" tamanho={19} />
			<span class="so-voz">com transmissão em directo</span>
		</span>
	{/if}

	{#if jogado}
		<span class="golos" aria-label={`${jogo.gc} a ${jogo.gf}`}>
			<b class:vencedor={ganhouCasa} use:piscar={jogo.gc}>{jogo.gc}</b>
			<b class:vencedor={ganhouFora} use:piscar={jogo.gf}>{jogo.gf}</b>
		</span>
	{/if}
</svelte:element>

<style>
	.camara {
		display: flex;
		align-items: center;
		justify-content: center;
	}
	/* **`:global(svg)` e não `color` no pai.** O `Icone.svelte` põe `color: var(--suave)` no
	   próprio `<svg>`, e uma regra no elemento ganha sempre à herança — a câmara saía cinzenta
	   com o pai pintado de vermelho. Levei uma volta inteira a perceber: o `getComputedStyle`
	   da célula dizia `rgb(220,38,38)` e o ícone continuava cinzento no ecrã, porque a cor
	   que eu media não era a que o desenho usava. O resto da base de código já contornava
	   isto da mesma maneira, na barra de separadores da ficha de jogo. */
	.camara :global(svg) {
		color: var(--directo);
	}
	/* visível para quem lê por voz, fora do ecrã para quem vê — o ícone sozinho não diz nada
	   a um leitor de ecrã, e um `title` não é lido em telemóvel */
	.so-voz {
		position: absolute;
		width: 1px; height: 1px;
		padding: 0; margin: -1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}

	/* uma coluna a mais, e só nas linhas que têm câmara: posta em todas, o intervalo da
	   grelha abria um buraco de 8 px em cada linha da lista por causa de uma célula vazia */
	.linha.comDirecto {
		grid-template-columns: 3.1rem 1fr auto auto;
	}

	.linha {
		display: grid;
		/* sem coluna de resultado quando não há resultado: o nome fica com esse espaço */
		grid-template-columns: 3.1rem 1fr auto;
		align-items: center;
		gap: var(--e-3);
		padding: var(--e-3) var(--e-1);
		/* separador fraco **dentro** de uma secção; o forte fica para a dividir da
		   seguinte. São dois níveis onde antes havia um, e é isso que faz a lista ler-se
		   como blocos em vez de uma régua contínua. */
		border-bottom: 1px solid var(--borda-fraca);
		text-decoration: none;
		color: inherit;
		font-size: var(--t-base);
	}
	.ligavel:hover, .ligavel:focus-visible { background: var(--acento-fraco); outline: none; }
	/* no telemóvel não há `hover`: sem isto, tocar numa linha não dá retorno nenhum */
	.ligavel:active { background: var(--acento-fraco); }

	.quando { display: flex; flex-direction: column; line-height: 1.3; }
	.dia, .hora { color: var(--suave); font-variant-numeric: tabular-nums;
		font-size: var(--t-pequeno); }

	/* um jogo a decorrer tem de se distinguir de um já fechado antes de ser lido */
	.escalao { font-size: var(--t-micro); font-weight: 600; letter-spacing: 0.03em;
		color: var(--suave); white-space: nowrap; }

	/* `nowrap`: na coluna de 3.1rem o "AO VIVO" partia-se em duas linhas */
	.vivo { display: inline-flex; align-items: center; gap: var(--e-1); white-space: nowrap;
		font-size: var(--t-micro); font-weight: 600; letter-spacing: 0.03em; color: var(--vivo); }
	.vivo i { width: 6px; height: 6px; border-radius: 50%; background: var(--vivo);
		animation: pulsar 1.6s ease-in-out infinite; }
	/* tabulares: o relógio muda a cada ronda e com largura variável dançava na coluna */
	.conta { font-size: var(--t-pequeno); font-weight: 600; color: var(--vivo);
		font-variant-numeric: tabular-nums; }
	@keyframes pulsar { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
	@media (prefers-reduced-motion: reduce) { .vivo i { animation: none; } }
	.dia { font-weight: 600; }

	.equipas { display: grid; gap: var(--e-0); min-width: 0; }
	/* **`width: max-content` quando a equipa é um link**, para o alvo agarrar o emblema e o nome
	   e não a coluna inteira: um alvo que se estende por espaço vazio engana o dedo. O
	   `max-width` mantém as reticências nos nomes compridos — mediram-se 15 nomes cortados em 34
	   num domingo, e é por isso que as equipas estão empilhadas. */
	.equipa { display: flex; align-items: center; gap: var(--e-2); min-width: 0;
		width: max-content; max-width: 100%;
		text-decoration: none; color: inherit; border-radius: 6px; }
	/* a área de toque não se dá a conhecer sozinha: o sublinhado ao passar e ao focar é o que
	   diz "isto abre a equipa" a quem experimenta */
	a.equipa:hover .nome, a.equipa:focus-visible .nome { text-decoration: underline; }
	a.equipa:focus-visible { outline: 2px solid var(--acento); outline-offset: 2px; }
	/* quem perdeu recua para o nível secundário: lê-se quem ganhou sem ler os números */
	.nome { overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
		color: var(--texto-2); }
	.vencedor .nome { color: var(--texto); font-weight: 600; }
	.minha .nome { color: var(--acento); font-weight: 600; }

	/* os golos alinhados com as equipas, linha a linha, e em números tabulares para que o
	   7 e o 11 fiquem na mesma coluna */
	.golos {
		display: grid;
		gap: var(--e-0);
		justify-items: end;
		min-width: 1.2rem;
		font-variant-numeric: tabular-nums;
		font-size: var(--t-destaque);
	}
	.golos b { font-weight: 400; color: var(--texto-2); line-height: 1.25;
		padding: 0 var(--e-1); margin: 0 calc(var(--e-1) * -1); }
	.golos b.vencedor { font-weight: 600; color: var(--texto); }
</style>
