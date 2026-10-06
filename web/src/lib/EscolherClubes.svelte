<script lang="ts">
	/**
	 * Escolher as equipas a seguir: uma grelha de emblemas, e um painel por clube.
	 *
	 * É o primeiro ecrã de quem abre a app, e por isso tem de dar valor antes de pedir
	 * paciência. A ordem anterior — um guia primeiro, a app depois — pedia o contrário.
	 *
	 * **Porque é um painel por cima e não uma área a expandir por baixo.** Os clubes grandes
	 * têm muitas equipas: o AE FISICA tem 33 em oito escalões, sete deles com A e B. Expandir
	 * isso na grelha empurrava os outros clubes para fora do ecrã e obrigava a rolar uma
	 * lista de 33 linhas entre dois emblemas. No painel a lista é dona do espaço, rola
	 * sozinha, e a grelha continua onde estava quando se fecha.
	 *
	 * A estrela aparece em dois graus: cheia na equipa que se segue, vazia no emblema do
	 * clube que tem alguma seguida lá dentro.
	 */
	import Emblema from './Emblema.svelte';
	import Icone from './Icone.svelte';
	import {
		agruparClubes,
		etiquetasDoEscalao,
		familiaDaProva,
		seguidasNoClube,
		type Clube
	} from './clubes';
	import { favoritos } from './favoritos.svelte';
	import { porEscalao } from './escaloes';
	import type { EquipaIndice } from './tipos';

	let {
		equipas,
		emblemas,
		usos = {},
		vivas,
		provas,
		concluir
	}: {
		equipas: EquipaIndice[];
		emblemas: Record<string, string>;
		/** jogos por nome de equipa: desempata a grafia certa da gralha no nome do clube */
		usos?: Record<string, number>;
		/** as competições que ainda têm jogos por jogar — serve para marcar, não para esconder */
		vivas: Set<number>;
		/** id da competição → nome da prova, para dizer em que prova cada equipa anda */
		provas: Record<number, string>;
		/** chamado quando a pessoa dá por terminada a escolha */
		concluir?: () => void;
	} = $props();

	const clubes = $derived(agruparClubes(equipas, emblemas, usos));
	let aberto = $state<Clube | null>(null);

	/** O que escolheu no filtro de prova dentro do painel. `null` = todas. */
	let familiaEscolhida = $state<string | null>(null);

	/**
	 * Abrir um clube limpa o filtro do clube anterior.
	 *
	 * Sem isto o filtro ficava colado: medido a 06/10/2026, filtrei o AE FISICA por
	 * "Encontros Distritais", fechei, abri o SC TOMAR — que não tem nenhum — e o painel abriu
	 * com **zero linhas** e sem explicação nenhuma. Nem os chips apareciam para desfazer, por
	 * só haver uma família neste clube.
	 */
	function abrir(c: Clube) {
		familiaEscolhida = null;
		aberto = c;
	}

	/**
	 * As equipas do clube aberto: **todas**, com a prova de cada uma à vista.
	 *
	 * Houve aqui um erro meu que o Pedro apanhou. Ele propôs um filtro por competição para a
	 * pessoa poder escolher, e eu transformei-o num filtro que escondia escalões — só
	 * mostrava quem tivesse prova a decorrer. O HC SINTRA tem seniores masculinos e
	 * femininos, e as duas jogam só Taças já terminadas: as duas desapareciam, e quem
	 * seguisse os seniores do Sintra não tinha como os escolher.
	 *
	 * Agora não se esconde nada. A prova de cada equipa é dita na linha, uma prova acabada
	 * diz que acabou, e o filtro existe mas é a pessoa a usá-lo.
	 */
	const linhas = $derived.by(() => {
		if (!aberto) return [];
		const porCat = new Map<string, typeof aberto.equipas>();
		for (const e of aberto.equipas) porCat.set(e.categoria, [...(porCat.get(e.categoria) ?? []), e]);
		const saida = [];
		for (const [categoria, lista] of porCat) {
			const etiquetas = etiquetasDoEscalao(lista);
			for (const e of lista) {
				const fam = new Map<string, boolean>();
				for (const c of e.competicoes) {
					const nome = provas[c];
					if (!nome) continue;
					const f = familiaDaProva(nome);
					// viva se alguma das provas dessa família ainda tem jogos por jogar
					fam.set(f, (fam.get(f) ?? false) || vivas.has(c));
				}
				saida.push({
					...e,
					categoria,
					etiqueta: etiquetas.get(e.equipa) ?? categoria,
					familias: [...fam].map(([nome, viva]) => ({ nome, viva }))
				});
			}
		}
		return saida.sort(
			(a, b) => porEscalao(a.categoria, b.categoria) || a.equipa.localeCompare(b.equipa, 'pt')
		);
	});

	/** As famílias de prova presentes neste clube, para os chips do filtro. */
	const familias = $derived([
		...new Set(linhas.flatMap((l) => l.familias.map((f) => f.nome)))
	]);

	const visiveis = $derived(
		familiaEscolhida === null
			? linhas
			: linhas.filter((l) => l.familias.some((f) => f.nome === familiaEscolhida))
	);

	const segue = (equipa: string, categoria: string) => favoritos.segue(equipa, categoria);
	const total = $derived(favoritos.lista.length);
</script>

<div class="cabeca">
	<h1>Segue as tuas equipas</h1>
	<p>
		Toca num clube e escolhe os escalões. Fica guardado neste telemóvel e nunca sai dele —
		podes mudar sempre que quiseres.
	</p>
</div>

<div class="grelha" class:esbatida={aberto}>
	{#each clubes as c (c.emblema)}
		{@const n = seguidasNoClube(c, favoritos.lista)}
		<button class="clube" onclick={() => abrir(c)} aria-label={`Escolher escalões do ${c.nome}`}>
			<span class="selo">
				<Emblema equipa={c.nome} src={c.emblema} tamanho={46} />
				{#if n > 0}
					<span class="marca" aria-hidden="true"><Icone nome="estrela-contorno" tamanho={14} /></span>
				{/if}
			</span>
			<span class="nome">{c.nome}</span>
		</button>
	{/each}
</div>

<!--
  Sempre visível, e colado ao fundo acima da barra de navegação.
  Com zero equipas fica cinzento e inerte, mas presente: é ele que diz o que falta fazer e
  como se avança. Esconder o caminho de saída até a pessoa acertar na acção certa é deixá-la
  sem saber se já acabou.
-->
<div class="rodape">
	<button class="principal" disabled={total === 0} onclick={() => concluir?.()}>
		{#if total === 0}
			Escolhe ao menos uma equipa
		{:else}
			Continuar com {total} {total === 1 ? 'equipa' : 'equipas'}
		{/if}
	</button>
</div>

{#if aberto}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div class="veu" onclick={() => (aberto = null)}></div>
	<div class="painel" role="dialog" aria-modal="true" aria-label={aberto.nome}>
		<div class="topo">
			<Emblema equipa={aberto.nome} src={aberto.emblema} tamanho={34} />
			<strong>{aberto.nome}</strong>
			<button class="fechar" onclick={() => (aberto = null)} aria-label="Fechar">×</button>
		</div>
		{#if familias.length > 1}
			<div class="filtro" role="group" aria-label="Filtrar por prova">
				<button class:activo={familiaEscolhida === null} onclick={() => (familiaEscolhida = null)}>
					Todas
				</button>
				{#each familias as f (f)}
					<button class:activo={familiaEscolhida === f} onclick={() => (familiaEscolhida = f)}>
						{f}
					</button>
				{/each}
			</div>
		{/if}
		<ul class="escaloes">
			{#each visiveis as e (e.equipa + e.categoria)}
				{@const activo = segue(e.equipa, e.categoria)}
				<li>
					<button
						class="escalao"
						class:activo
						aria-pressed={activo}
						onclick={() => favoritos.alternar(e.equipa, e.categoria, e.competicoes)}
					>
						<span class="qual">
							<span class="cat">{e.etiqueta}</span>
							<span class="prova">
								{#each e.familias as f, i (f.nome)}{i ? ' · ' : ''}{f.nome}{f.viva
										? ''
										: ' (terminada)'}{/each}
							</span>
						</span>
						<span class="estrela" class:acesa={activo} aria-hidden="true">
							<Icone nome={activo ? 'estrela' : 'estrela-contorno'} tamanho={16} />
						</span>
					</button>
				</li>
			{/each}
		</ul>
	</div>
{/if}

<style>
	.cabeca { margin-bottom: var(--e-4); }
	h1 { font-size: var(--t-titulo); margin: 0 0 var(--e-2); }
	.cabeca p {
		margin: 0;
		font-size: var(--t-pequeno);
		line-height: 1.5;
		color: var(--texto-2);
	}

	/* três por linha: com emblemas a 46px é o que deixa o nome do clube caber sem cortar */
	.grelha {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--e-2);
		/* espaço para a última fila não ficar debaixo do botão fixo */
		padding-bottom: calc(48px + var(--e-6));
		transition: filter 0.18s, opacity 0.18s;
	}
	/* o painel manda; o que está atrás recua sem desaparecer */
	.grelha.esbatida { filter: blur(3px); opacity: 0.5; pointer-events: none; }
	@media (prefers-reduced-motion: reduce) {
		.grelha { transition: none; }
	}

	.clube {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		/* o emblema ao meio do quadrado: o nome fica encostado em baixo e o espaço que
		   sobra reparte-se acima e abaixo do emblema, em vez de ficar todo em baixo */
		justify-content: center;
		gap: var(--e-2);
		padding: var(--e-3) var(--e-1);
		min-height: 112px;
		border-radius: var(--raio-cartao);
		border: 1px solid var(--borda);
		background: var(--cartao);
		color: inherit;
		font: inherit;
		cursor: pointer;
	}
	.clube:active { background: var(--acento-fraco); }
	.selo { display: flex; }
	/* a estrela vazia no canto do quadrado — não do emblema: diz que há um favorito lá
	   dentro, sem dizer qual */
	.marca {
		position: absolute;
		top: var(--e-1);
		right: var(--e-1);
		display: flex;
	}
	.marca :global(svg) { color: var(--estrela); }
	.nome {
		font-size: var(--t-micro);
		line-height: 1.25;
		/* duas linhas sempre, ocupadas ou não: sem isto um clube de nome curto empurra o
		   emblema para baixo e outro de nome longo empurra-o para cima, e os emblemas ficam
		   a alturas diferentes de quadrado para quadrado */
		min-height: 2.5em;
		text-align: center;
		color: var(--texto-2);
		overflow: hidden;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
	}

	.rodape {
		position: fixed;
		/* acima da barra de navegação, que tem 52px mais a área segura do iPhone */
		bottom: calc(52px + env(safe-area-inset-bottom));
		left: 0;
		right: 0;
		/* abaixo do véu do painel (30), para o painel aberto o cobrir como ao resto */
		z-index: 9;
		padding: var(--e-3) 0.9rem;
		background: var(--fundo);
		border-top: 1px solid var(--borda-fraca);
	}
	/*
	  Declara a altura da barra de acção, e quem flutua no fundo sobe.
	  A bolha de opinião vive a 52px do fundo, que é exactamente onde este botão passou a
	  estar — num ecrã de 375px tapava-lhe a ponta direita e roubava o toque. Tentei primeiro
	  um `:global(.bolha)` com a posição nova e perdeu: o `.bolha` do `Feedback.svelte` é uma
	  classe com âmbito, logo vale 0-2-0 contra o meu 0-1-0. Em vez de forçar com `!important`,
	  publica-se aqui a medida e é a bolha que a lê.
	*/
	:global(:root) {
		--acima-da-barra: 52px;
	}

	.principal:disabled {
		border-color: var(--borda);
		background: var(--borda);
		color: var(--suave);
		cursor: default;
	}
	.principal {
		width: 100%;
		min-height: 48px;
		border-radius: var(--raio);
		border: 1px solid var(--acento);
		background: var(--acento);
		color: var(--cartao);
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}

	.veu {
		position: fixed;
		inset: 0;
		z-index: 30;
		background: rgb(0 0 0 / 0.45);
	}
	.painel {
		position: fixed;
		z-index: 31;
		right: var(--e-3);
		left: var(--e-3);
		/*
		  **Ancorado pelo topo, e não pelo fundo.**
		  Antes crescia para cima a partir da barra de navegação: um clube com quatro
		  escalões dava uma caixa baixa e um com trinta e duas dava uma caixa alta, e o bordo
		  de cima mudava de sítio entre clubes — e também ao filtrar, porque a lista encurta.
		  A pessoa perdia o ponto de referência a cada toque. Agora o topo está sempre no
		  mesmo lugar e é a altura que varia.
		*/
		top: calc(var(--topo, 96px) + var(--e-3));
		max-height: calc(
			100vh - var(--topo, 96px) - 52px - env(safe-area-inset-bottom) - var(--e-6)
		);
		max-width: 26rem;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		border-radius: var(--raio-cartao);
		border: 1px solid var(--borda);
		background: var(--cartao);
		box-shadow: 0 8px 28px rgb(0 0 0 / 0.3);
	}
	.topo {
		/* nem o cabeçalho nem os chips encolhem: quem rola é a lista */
		flex: 0 0 auto;
		display: flex;
		align-items: center;
		gap: var(--e-3);
		padding: var(--e-4) var(--e-4) var(--e-3);
		border-bottom: 1px solid var(--borda-fraca);
		font-size: var(--t-base);
	}
	.topo strong { flex: 1; min-width: 0; }
	.fechar {
		border: 0;
		background: none;
		color: var(--suave);
		font-size: var(--t-titulo);
		line-height: 1;
		padding: 0 var(--e-2);
		min-height: 36px;
		cursor: pointer;
	}

	.filtro {
		flex: 0 0 auto;
		display: flex;
		gap: var(--e-1);
		overflow-x: auto;
		scrollbar-width: none;
		padding: var(--e-3) var(--e-4) var(--e-1);
		border-bottom: 1px solid var(--borda-fraca);
	}
	.filtro::-webkit-scrollbar { display: none; }
	.filtro button {
		flex: 0 0 auto;
		min-height: 32px;
		padding: var(--e-1) var(--e-3);
		border-radius: var(--raio-pilula);
		border: 1px solid var(--borda);
		background: transparent;
		color: var(--suave);
		font: inherit;
		font-size: var(--t-micro);
		white-space: nowrap;
		cursor: pointer;
	}
	.filtro button.activo {
		background: var(--acento);
		border-color: var(--acento);
		color: var(--cartao);
		font-weight: 600;
	}
	/* `min-height: 0`: sem isto um filho de flex não encolhe abaixo do seu conteúdo, e era a
	   lista que empurrava os chips para fora em vez de rolar por dentro */
	.escaloes {
		flex: 1 1 auto;
		min-height: 0;
		list-style: none;
		margin: 0;
		padding: var(--e-2);
		overflow-y: auto;
		overscroll-behavior: contain;
	}
	.escalao {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--e-3);
		width: 100%;
		min-height: 54px;
		padding: 0 var(--e-3);
		border: 0;
		border-radius: var(--raio);
		background: none;
		color: var(--texto-2);
		font: inherit;
		font-size: var(--t-base);
		cursor: pointer;
	}
	.escalao:active { background: var(--acento-fraco); }
	.escalao.activo .cat { color: var(--texto); font-weight: 600; }
	.qual { display: flex; flex-direction: column; align-items: flex-start; gap: 1px; min-width: 0; }
	.cat { font-size: var(--t-base); }
	/* a prova em que a equipa anda: é o que distingue o campeonato de um torneio de abertura */
	.prova {
		font-size: var(--t-micro);
		color: var(--suave);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 100%;
	}
	.estrela { display: flex; }
	/* a apagada fica cinzenta de propósito: é um sítio onde se pode tocar, não um favorito */
	.estrela :global(svg) { color: var(--borda); }
	.estrela.acesa :global(svg) { color: var(--estrela); }
</style>
