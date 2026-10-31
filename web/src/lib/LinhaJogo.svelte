<script lang="ts">
	import Emblema from './Emblema.svelte';
	import Icone from './Icone.svelte';
	import { directoDe } from './directos';
	import { emCurso, escalaoCurto, faseCurta } from './formato';
	import { piscar } from './piscar';
	import { destinoDoJogo } from './destinos';
	import { barraDoMerito, descricaoDoMerito } from './meritoDoJogo';
	import type { JogoAgenda } from './tipos';
	import { horaNoAparelho } from './dia';

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
	/** Fora do fuso de Lisboa, a hora do aparelho à frente e a do jogo por baixo — ver `dia.ts`. */
	const local = $derived(horaNoAparelho(jogo.data, jogo.hora));
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
	// **Um alvo por linha**, e é sempre a ficha do jogo — mesmo num jogo por disputar, que desde
	// 09/10 abre com o recinto e a hora. A razão é do dono e está no `destinos.ts`.
	const destino = $derived(destinoDoJogo(jogo));
	/**
	 * O Mérito numa linha, por baixo do jogo — pedido do dono a 27/10/2026, para se ver sem
	 * abrir a ficha que o 21–5 de um jogo pode ser um 1–11 no Mérito. Só nos jogos disputados
	 * com Mérito na agenda; os outros ficam exactamente como eram. Ver `meritoDoJogo.ts`.
	 */
	const merito = $derived(jogado && jogo.merito ? jogo.merito : null);
	const barras = $derived(merito ? [barraDoMerito(merito.casa), barraDoMerito(merito.fora)] : []);
	const pts = (n: number) => `${n}`.replace('-', '−');

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
  **Um alvo por linha, e é a ficha do jogo.** A linha inteira é o link; as equipas são texto.

  Houve uma versão, a 20/10/2026, em que a linha tinha um link a cobri-la e as equipas
  clicáveis por cima. O dono parou-a no site de testes: *"cada vez que quero abrir o jogo posso
  sem querer carregar em cima do nome clube e abrir o clube ao invés do jogo"*. O pedido que
  motivou aquilo fica resolvido na ficha de jogo, onde o emblema abre a equipa sem disputar
  alvo com nada. Ver `destinos.ts`.
-->
<svelte:element this={destino ? 'a' : 'div'} href={destino} class="linha"
	class:ligavel={destino} class:comDirecto={!!directo} class:duasHoras={!!local}>
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
			{#if local}
				<span class="hora">{local.hora}{#if local.dias}<sup>{local.dias > 0 ? '+' : '−'}{Math.abs(local.dias)}</sup>{/if}</span>
				<span class="lisboa">{jogo.hora} PT</span>
			{:else}
				<span class="hora">{jogo.hora ?? '—'}</span>
			{/if}
		{/if}
		{#if comEscalao}<span class="escalao">{escalaoCurto(jogo.cat)}</span>{/if}
	</span>

	<span class="equipas">
		<span class="equipa" class:vencedor={ganhouCasa} class:minha={seguida?.(jogo.casa)}>
			<Emblema equipa={jogo.casa} src={emblemas[jogo.casa]} tamanho={18} />
			<span class="nome">{jogo.casa}</span>
		</span>
		<span class="equipa" class:vencedor={ganhouFora} class:minha={seguida?.(jogo.fora)}>
			<Emblema equipa={jogo.fora} src={emblemas[jogo.fora]} tamanho={18} />
			<span class="nome">{jogo.fora}</span>
		</span>
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

	{#if merito}
		<span class="merito">
			<span class="so-voz">{descricaoDoMerito(merito, jogo.casa, jogo.fora)}</span>
			<span class="rotulo" aria-hidden="true">Mérito</span>
			<!-- **O total à frente da barra de cada equipa, e não um placar "1–11" no fim.** Com
			     totais negativos o placar lia-se "10−−5" e "−8–1" — visto a 375 px a 27/10/2026,
			     em 8 dos 19 jogos dos Benjamins nível II. Os dois números continuam lado a lado,
			     casa e fora, que é o resultado do Mérito. -->
			<span class="barras" aria-hidden="true">
				{#each barras as b, i (i)}
					<span class="conta">
						<span class="barra" class:abaixo={b.abaixoDeZero}>
							<i class="ficou" style:width="{b.ficou * 100}%"></i><i class="perdeu"
								style:width="{b.perdeu * 100}%"></i>
						</span>
						<b class:abaixo={b.abaixoDeZero}>{pts(b.total)}</b>
					</span>
				{/each}
			</span>
			{#if merito.por_confirmar}
				<i class="duvida" aria-hidden="true" title="com pontos por confirmar">?</i>
			{/if}
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
	/* Abaixo do `--t-micro`, de propósito: o dono pediu-a *"mais pequena"* a 31/10/2026, e é
	   uma nota para quem está fora, não a hora principal. 9 px, como a hora do calendário do mês.
	   E "PT", não "Lisboa", também a pedido dele: "10:00 Lisboa" media 69 px e a coluna tem 50,
	   ia por baixo do emblema; "10:00 PT" mede 41 e cabe sem alargar a coluna. */
	.lisboa { color: var(--suave); font-variant-numeric: tabular-nums; font-size: 0.5625rem;
		white-space: nowrap; }
	.hora sup { font-size: 0.7em; margin-left: 0.05em; }
	/* a hora de quem está a ver manda; a de Lisboa fica por baixo, mais pequena */
	.duasHoras .hora { color: var(--texto); font-weight: 600; }

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
	.equipa { display: flex; align-items: center; gap: var(--e-2); min-width: 0; }
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

	/* **Uma linha só, e nas mesmas colunas do jogo**: o rótulo na da hora, as barras na dos
	   nomes, o placar do Mérito na dos golos. O `subgrid` é o que as alinha de linha para linha
	   numa lista; sem ele (navegadores antigos) cai para uma grelha própria, igual em desenho. */
	.merito { grid-column: 1 / -1; display: grid; grid-template-columns: subgrid;
		align-items: center; line-height: 1.1; }
	/* o intervalo da grelha vale também entre filas: sem isto a linha do Mérito ficava a 8 px
	   das equipas e a linha crescia 20 px (de 56 para 76, medido a 27/10/2026) */
	.linha:has(.merito) { row-gap: var(--e-0); }
	.merito .rotulo { font-size: var(--t-micro); font-weight: 600; letter-spacing: 0.03em;
		color: var(--suave); text-transform: uppercase; }
	.merito .barras { grid-column: 2 / -2; display: grid; grid-template-columns: 1fr 1fr;
		gap: var(--e-4); max-width: 16rem; }
	.conta { display: flex; align-items: center; gap: var(--e-2); min-width: 0; }
	.conta b { min-width: 1.6rem; font-size: var(--t-micro); font-weight: 600;
		color: var(--texto-2); font-variant-numeric: tabular-nums; }
	.conta b.abaixo { color: var(--perde); }
	.barra { flex: 1; display: flex; height: 6px; border-radius: 3px; overflow: hidden;
		background: var(--borda-fraca); }
	.barra .ficou { background: var(--ganha-barra); }
	.barra .perdeu { background: var(--perde-barra); }
	.duvida { grid-column: -2 / -1; justify-self: end; font-style: normal; font-weight: 700;
		font-size: var(--t-pequeno); color: var(--aviso); }
</style>
