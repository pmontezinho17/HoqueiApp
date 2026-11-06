<script lang="ts">
	import Cronologia from '$lib/Cronologia.svelte';
	import CrachaEscalao from '$lib/CrachaEscalao.svelte';
	import RotuloCalculada from '$lib/RotuloCalculada.svelte';
	import { classificacaoDoJogo, tabelasDe } from '$lib/classificacao';
	import Emblema from '$lib/Emblema.svelte';
	import FichaEquipas from '$lib/FichaEquipas.svelte';
	import TabelaClassificacao from '$lib/TabelaClassificacao.svelte';
	import LegendaClassificacao from '$lib/LegendaClassificacao.svelte';
	import TabelaMerito from '$lib/TabelaMerito.svelte';
	import LegendaMerito from '$lib/LegendaMerito.svelte';
	import Faixa from '$lib/Faixa.svelte';
	import InfoJogo from './InfoJogo.svelte';
	import MeritoDoJogo from './MeritoDoJogo.svelte';
	import { contasDoJogo } from '$lib/meritoDoJogo';
	import Icone from '$lib/Icone.svelte';
	import Separadores from '$lib/Separadores.svelte';
	import Directo from '$lib/Directo.svelte';
	import { directoDe } from '$lib/directos';
	import { nomeProprio, nomeProva, situacaoADecorrer } from '$lib/formato';
	import { piscar } from '$lib/piscar';
	import { caminhoEquipa } from '$lib/slug';
	import { estadoDasFaltas, mostrarNoPlacar } from '$lib/faltas';
	import { estadoDoPlacar } from '$lib/placar';
	import { destinoDeVoltar, recuarNaHistoria, veioDeDentro } from '$lib/voltar';
	import type { EventoJogo } from '$lib/tipos';
	import { untrack } from 'svelte';
	import { afterNavigate } from '$app/navigation';

	let { data } = $props();
	const f = $derived(data.ficha);

	/**
	 * Chegámos aqui de dentro da app, ou de fora?
	 *
	 * O `from` do `afterNavigate` é `null` quando a página é a primeira do arranque — um link
	 * partilhado, um favorito, a app instalada a abrir de raiz. Nesse caso não há história para
	 * onde recuar e a seta tem de seguir o seu `href`. Ver `lib/voltar.ts`.
	 */
	let deDentro = $state(false);
	afterNavigate(({ from, type }) => {
		deDentro = veioDeDentro(type, from);
	});

	function voltar(e: MouseEvent) {
		if (!recuarNaHistoria(deDentro, { meta: e.metaKey, ctrl: e.ctrlKey, shift: e.shiftKey, alt: e.altKey, botao: e.button })) return;
		e.preventDefault();
		history.back();
	}
	/**
	 * Verdadeiro quando não há `match/<id>.json` publicado e o que se está a ver foi montado
	 * a partir da agenda — ver `lib/fichaDaAgenda.ts`.
	 *
	 * **Dizê-lo é metade da correcção.** Sem isto a página ficava correcta e muda: quem
	 * entrasse num jogo de amanhã via as equipas e a hora e não entendia porque é que não
	 * havia onze nem cronologia. O que falta não é um erro, é uma coisa que ainda não
	 * aconteceu, e isso explica-se numa linha.
	 */
	const semFicha = $derived(!!data.semFicha);

	// W3.6d: sem acontecimentos reais, a tab de eventos seria um ecrã vazio
	const ESTRUTURA = new Set(['inicio_parte', 'fim_parte', 'fim_jogo', 'por_iniciar']);
	/** Nem terminado, nem por começar: está a acontecer alguma coisa.
	 *
	 *  A regra era "tem período", e o período vinha de um padrão que só reconhecia
	 *  "Nª Parte (relógio)". Ao intervalo a app ficava **sem sinal nenhum** de que o jogo
	 *  estava a decorrer — foi o que o utilizador viu. A fonte diz-o num campo próprio. */
	const aDecorrer = $derived(situacaoADecorrer(f.situacao));
	/** Nem começou: a ficha que existe é a convocatória, e as colunas estão todas a zero. */
	const porComecar = $derived(!aDecorrer && /come[çc]ar/i.test(f.situacao ?? ''));

	/**
	 * Num jogo a decorrer a cronologia mostra-se **sempre**, mesmo só com o apito inicial.
	 * A regra era "só se houver um evento que não seja estrutural", e isso está ao contrário
	 * num jogo a decorrer: aos dois minutos ainda só há o "Início da 1ª Parte", e era
	 * precisamente aí que se abria o jogo à procura do que estava a acontecer.
	 */
	const temEventos = $derived(aDecorrer || f.cronologia.some((e) => !ESTRUTURA.has(e.tipo)));
	const temEquipas = $derived(f.equipas.some((e) => e.jogadores.length > 0));
	const temInfo = $derived(
		!!(f.data || f.hora || f.recinto || f.arbitros.length || f.boletim?.parciais?.length)
	);
	/**
	 * A classificação desta prova: tabela de pontos, Mérito, ou nenhuma.
	 *
	 * Até 07/10/2026 os Escolares e os Benjamins não tinham separador nenhum aqui, porque a
	 * fonte não publica tabela nesses escalões. Desde 21/10 têm o **Mérito**, que é a
	 * classificação que o Artigo 92.º manda usar ali — pedido do dono, e o terceiro ecrã da
	 * mesma história. Continua a não haver separador nas eliminatórias e nos jogos-treino, onde
	 * uma classificação não quer dizer nada — ver `vale_calcular` no raspador.
	 *
	 * A decisão vive no `classificacaoDoJogo`, com a medição das 37 provas ao lado.
	 */
	const oQueMostrar = $derived(classificacaoDoJogo(data.competicao, data.merito));
	const tabela = $derived(tabelasDe(data.competicao));
	const grupos = $derived(tabela.grupos);
	const merito = $derived(data.merito);
	const temTabela = $derived(oQueMostrar !== 'nenhuma');
	/** as duas contas do Mérito deste jogo — só nos Encontros Distritais e com boletim */
	const contas = $derived(contasDoJogo(f.merito, f.casa, f.fora));
	/** o que a legenda do Mérito precisa de saber sobre o que ainda não está confirmado */
	const meritoPorConfirmar = $derived(
		(merito?.linhas ?? []).reduce((n, l) => n + l.por_confirmar, 0)
	);
	const temSeparadores = $derived(temEventos || !!contas || temTabela || temEquipas || temInfo);

	/**
	 * A transmissão deste jogo, se houver — ver `directos.ts` para o porquê de ser uma lista
	 * escrita à mão.
	 */
	const directo = $derived(directoDe(f.id));

	type Tab = 'directo' | 'eventos' | 'merito' | 'tabela' | 'equipas' | 'info';
	let tab = $state<string>('eventos');
	/** os separadores que existem neste jogo, pela ordem em que aparecem na barra */
	const abas = $derived(
		(
			[
				// primeiro de todos: quem tem onde ver o jogo não quer começar pela cronologia
				['directo', !!directo],
				['eventos', temEventos],
				// ao lado da classificação, e antes dela: é deste jogo, e a tabela é da série
				['merito', !!contas],
				['tabela', temTabela],
				['equipas', temEquipas],
				['info', temInfo]
			] as [Tab, boolean][]
		)
			.filter(([, ha]) => ha)
			.map(([id]) => id)
	);
	/**
	 * O que cada separador mostra na barra: o `curto` por baixo do ícone, o `rotulo` para quem
	 * ouve por voz. Curtos porque aqui podem ser seis — a 375px são 62px cada.
	 */
	const NA_BARRA: Record<Tab, { rotulo: string; curto?: string; icone: string; classe?: string }> = {
		directo: { rotulo: 'Ver em directo', curto: 'Directo', icone: 'directo', classe: 'aoVivo' },
		eventos: { rotulo: 'Eventos do jogo', curto: 'Eventos', icone: 'eventos' },
		merito: { rotulo: 'Mérito deste jogo', curto: 'Mérito', icone: 'merito' },
		tabela: { rotulo: 'Classificação', icone: 'tabela' },
		// num jogo por começar isto é a convocatória, não a ficha
		equipas: { rotulo: 'Equipas', icone: 'equipas' },
		info: { rotulo: 'Informações', curto: 'Info', icone: 'informacoes' }
	};
	const separadores = $derived(
		abas.map((valor) => ({
			valor: valor as string,
			...NA_BARRA[valor],
			...(valor === 'equipas' && porComecar ? { rotulo: 'Convocados' } : {})
		}))
	);
	// Num jogo a decorrer é a cronologia que se quer, não a ficha — **excepto quando há
	// transmissão**: aí o que se quer é o jogo, e a cronologia está a uma passagem de dedo.
	$effect(() => {
		if (aDecorrer) tab = directo ? 'directo' : 'eventos';
	});

	/**
	 * O separador escolhido tem de **existir** neste jogo.
	 *
	 * Apanhado pelo dono a 08/10/2026, num jogo ainda por começar: a barra mostrava
	 * "Equipas" e "Informações" e o corpo estava **em branco**, porque o separador escolhido
	 * era `eventos` — que não existe antes do apito inicial — e não havia nada para desenhar.
	 * Quem chegava ali tinha de adivinhar que precisava de carregar num dos dois.
	 */
	$effect(() => {
		if (!abas.length || abas.includes(tab as Tab)) return;
		// Num jogo por começar, o que se quer ver é a **convocatória** — foi isso que o dono
		// foi procurar. Sem esta preferência caía na classificação, que é a primeira da barra.
		if (porComecar && abas.includes('equipas')) {
			tab = 'equipas';
			return;
		}
		// **Sem ficha publicada, cai nas Informações.** Desde 20/10/2026 a lista de jogos abre
		// também os jogos por disputar, a pedido do dono: *"num dia por disputar, acho que seria
		// interessante entrar no menu de jogo, mas apresentar apenas o tab de informação"*. Sem
		// isto chegava-se aqui na classificação da prova — correcta, mas não é o que quem vai ao
		// pavilhão na véspera veio buscar: veio ver a hora e o recinto.
		tab = semFicha && abas.includes('info') ? 'info' : abas[0];
	});

	/**
	 * Os marcadores, numa coluna por equipa e por baixo dela.
	 *
	 * Já tinham estado ao centro, numa só lista por ordem de jogo com o resultado a andar.
	 * Lia-se bem a história do jogo, mas não se via de quem era cada golo sem ir ler os
	 * números — e num 21–7 isso é trabalho a mais. Por baixo de cada equipa não há dúvida
	 * nenhuma. A história completa continua no separador dos eventos.
	 */
	const marcadores = $derived.by(() => {
		const por = { casa: [] as string[], fora: [] as string[] };
		for (const e of f.cronologia as EventoJogo[]) {
			if (e.tipo !== 'golo') continue;
			const minuto = e.minuto !== null ? `${e.minuto}'` : '';
			const nome = e.jogador ? nomeProprio(e.jogador) : '';
			const rotulo = [minuto, nome].filter(Boolean).join(' ');
			if (!rotulo) continue;
			if (e.equipa === f.casa) por.casa.push(rotulo);
			else if (e.equipa === f.fora) por.fora.push(rotulo);
		}
		return por;
	});
	const temMarcadores = $derived(marcadores.casa.length + marcadores.fora.length > 0);

	/** A fonte repete o escalão no nome da prova ("TAÇA ... - SENIORES MASCULINOS"). */
	const provaCurta = $derived.by(() => {
		const nome = f.grupo_nome ?? f.competicao ?? '';
		if (!f.categoria) return nome;
		return nome.replace(new RegExp(`\\s*[-·]\\s*${f.categoria}\\s*$`, 'i'), '').trim() || nome;
	});

	/** A fonte só publica o nome do recinto, que não geocodifica; a morada é nossa. */
	const morada = $derived(f.recinto ? (data.recintos?.[f.recinto] ?? null) : null);
	const linkMapa = $derived(
		morada ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(morada)}` : null
	);

	/**
	 * O herói colapsa **a acompanhar o scroll**, e nunca desaparece.
	 *
	 * Era um salto: o cabeçalho ia-se embora e uma barra à parte aparecia por cima. Agora é
	 * o mesmo elemento, colado ao topo, a encolher entre 0 e 1 à medida que se rola — os
	 * nomes, os golos e a competição fecham-se, os emblemas e o resultado diminuem, e o que
	 * fica é a faixa com o essencial.
	 *
	 * O alcance é a altura real do que se fecha, medida: assim não há número de píxeis
	 * escrito à mão que deixe de servir num jogo com vinte golos.
	 */
	let k = $state(0);
	/** altura natural do que colapsa, medida num invólucro que não é constrangido */
	let alturaExtras = $state(0);
	let cromado = $state<HTMLElement | null>(null);
	let extras = $state<HTMLElement | null>(null);
	/**
	 * A altura do cromado, **somada** e não medida de uma vez só.
	 *
	 * Medir `.cromado` inteiro é uma corrida que se perde. A altura do que se fecha chega
	 * por um `bind:clientHeight`, e quando o observador acorda o `--alt` ainda não foi ao
	 * DOM: medido aqui, o estado já dizia 121 e o ecrã ainda dava 114. A reserva nascia
	 * 76px curta e o cromado ficava pousado por cima do princípio da lista — a 05/10, no
	 * SC TORRES–CD PAÇO ARCOS B, o único golo do jogo estava no separador dos eventos e
	 * **não se via**.
	 *
	 * Somadas, as duas parcelas medem-se cada uma onde é fiável: a base descontando os
	 * extras ao cromado, os extras no invólucro que não os constrange. A conta fecha logo
	 * no primeiro quadro, haja ou não notificação de tamanho pelo meio.
	 *
	 * O `ResizeObserver` fica para o que muda **depois**: os emblemas chegam da rede, o
	 * nome de uma prova parte numa linha a mais, o telemóvel roda, e numa ronda ao vivo
	 * entra um marcador novo — que é precisamente quando ninguém quer o cromado a tapar o
	 * que acabou de acontecer.
	 *
	 * A colapsada é apanhada à passagem; enquanto não foi vista, o alcance serve-se da
	 * altura do que se fecha, que lhe anda perto.
	 */
	let alturaBase = $state(0);
	let alturaColapsada = $state(0);
	$effect(() => {
		const el = cromado;
		const ex = extras;
		if (!el || !ex) return;
		// `untrack`: ler o `k` aqui dentro faria o efeito voltar a correr — e a trocar de
		// observador — a cada quadro de scroll. Quer-se um observador só, que leia o `k` do
		// momento em que mede.
		const medir = () =>
			untrack(() => {
				if (k === 0) alturaBase = el.offsetHeight - ex.offsetHeight;
				else if (k === 1) alturaColapsada = el.offsetHeight;
			});
		medir();
		const olho = new ResizeObserver(medir);
		olho.observe(el);
		return () => olho.disconnect();
	});
	/** o cromado aberto: o que fica mais o que se fecha */
	const alturaExpandida = $derived(alturaBase + alturaExtras);
	const alcance = $derived(
		Math.max(1, alturaExpandida && alturaColapsada
			? alturaExpandida - alturaColapsada
			: alturaExtras)
	);

	$effect(() => {
		const limite = alcance;
		// Directamente no `scroll` e **não** dentro de um `requestAnimationFrame`: o browser
		// estrangula o rAF quando o separador não está à vista, e aí o cabeçalho deixava de
		// colapsar. Ler o `scrollY` não força cálculo de layout, por isso não custa nada.
		const ao = () => (k = Math.min(1, Math.max(0, scrollY / limite)));
		ao();
		addEventListener('scroll', ao, { passive: true });
		return () => removeEventListener('scroll', ao);
	});

	// A parte do jogo, o resultado e as faltas: o dono enumerou a 21/10/2026 o que este placar
	// deve ter. A decisão do texto vive no `lib/placar.ts`, onde um teste lhe chega — aqui
	// mostrava-se o relógio e o período ficava escondido atrás dele.
	const estado = $derived(
		estadoDoPlacar({ aDecorrer, porComecar, periodo: f.periodo, relogio: f.relogio, situacao: f.situacao })
	);
	/** as faltas aparecem assim que o jogo começa, e não só ao vivo — ver `faltas.ts` */
	const jogoComecou = $derived(aDecorrer || !porComecar);
</script>

<svelte:head><title>{f.casa} {f.golos_casa}–{f.golos_fora} {f.fora}</title></svelte:head>

<!--
  A reserva guarda no fluxo a altura do cromado **expandido**, e não muda.

  Sem ela havia um ciclo: o herói encolhia, o documento encurtava, o browser puxava o scroll
  para trás e o herói voltava a crescer. Media-se: pedir 300px de scroll dava 263, e o
  colapso ficava preso. Com a reserva, encolher não mexe no documento.
-->
<div class="reserva" style="height: {alturaExpandida || ''}px">
<div class="cromado" class:fixo={k === 1} bind:this={cromado}>
<article class="heroi" style="--k: {k}; --alt: {alturaExtras}px">
	<!--
	  **Volta para onde a pessoa estava, não para a lista de jogos.**

	  Reportado a 18/10/2026: *"Estou dentro do menu da equipa. Escolho um jogo para ver os
	  detalhes. Se carrego para voltar para trás, volta ao menu principal, não ao menu onde se
	  estava."* O `href` era fixo, e fazia sentido quando a ficha só se abria a partir da lista
	  do dia — hoje abre-se também da equipa, da competição, da pesquisa e de O Meu Clube. E a
	  20/10 passou a abrir-se de **todas** as linhas, incluindo os jogos por disputar, o que
	  multiplicou as vezes que esta porta é usada.

	  O `href` fica, e é o que se segue quando não há história: um link partilhado, um favorito,
	  a app a abrir de raiz. Leva ao dia **deste** jogo e não a hoje — quem abriu um jogo de
	  quinta-feira quer voltar a quinta-feira. A decisão vive no `lib/voltar.ts`.
	-->
	<a class="voltar" href={destinoDeVoltar(f.data)} onclick={voltar} aria-label="Voltar">←</a>

	<!--
	  O escalão **acima** do resultado, e na parte que não se fecha.
	  Estava no fim do herói, dentro da área que colapsa ao rolar, e o dono não o encontrava
	  num jogo a decorrer: *"o escalão está muito escondido"*. É a primeira coisa que alguém
	  precisa de saber para situar o jogo — e é também o que o crachá diz num relance.
	-->
	{#if f.categoria}
		<a class="escalaoTopo" href={f.grupo_id ? `/competicoes/${f.grupo_id}` : '/competicoes'}>
			<CrachaEscalao categoria={f.categoria} tamanho={16} />
			<span>{f.categoria}</span>
		</a>
	{/if}

	<!-- sempre visível: é isto que sobra quando tudo o resto se fecha -->
	<div class="placar">
		<!--
		  **O emblema abre a equipa**, e não só o nome lá em baixo. Dois utilizadores pediram
		  exactamente isto, a 17/10/2026: *"só consigo entrar dentro dos detalhes de cada uma se
		  carregar no nome da equipa. Seria mais prático se carregar também no próprio emblema"*
		  e *"quando pressiono num símbolo da equipa (…) devia de ir para o detalhe da mesma"*.

		  Aqui não houve que desfazer nada: o placar nunca foi um link, por isso o emblema podia
		  passar a sê-lo sem o problema do `<a>` dentro de `<a>` que a lista de jogos tinha.

		  E ganha mais importância do que parece: os nomes vivem no bloco `.extras`, que colapsa
		  ao rolar num jogo a decorrer — o emblema é o que fica sempre no ecrã.
		-->
		<svelte:element this={f.categoria ? 'a' : 'span'} class="emb"
			href={f.categoria ? caminhoEquipa(f.casa, f.categoria) : null}
			aria-label={f.categoria ? `Ver ${f.casa}` : null}>
			<Emblema equipa={f.casa} src={data.emblemas[f.casa]} tamanho={44} />
		</svelte:element>
		<span class="centro">
			<span class="numeros" use:piscar={`${f.golos_casa}-${f.golos_fora}`}
				>{f.golos_casa}<span class="tr">–</span>{f.golos_fora}</span
			>
			<span class="estado" class:vivo={aDecorrer}>
				{#if aDecorrer}<i aria-hidden="true"></i>{/if}{estado}
			</span>
			<!--
			  **As faltas de equipa, assim que o jogo começa.** Pedido do dono a 10/10/2026 e
			  aprovado a 17/10 com o limite *"só faz sentido se for no ecrã de jogo ao vivo"*. A
			  21/10 ele alargou-o, ao enumerar o que o placar deve ter: *"num jogo a decorrer ou
			  finalizado devem aparecer as faltas cometidas por cada equipa"*. Num jogo por
			  começar continuam a não aparecer — a fonte publica `[null, null]` nesses, e um `0`
			  antes do apito seria um número inventado a partir de um campo vazio.

			  A decisão de quando mostrar e quando avisar vive no `$lib/faltas.ts`, para poder
			  ser testada sem montar este ecrã — é a regra que nasceu do Mérito desaparecido.

			  `aria-live="polite"` porque isto muda sozinho enquanto alguém olha: quem ouve a
			  página tem de saber que o número subiu, e `polite` espera que ela acabe de ler o
			  que estava a ler.
			-->
			{#if mostrarNoPlacar(jogoComecou, f.faltas)}
				<span class="faltas" aria-live="polite" aria-label="Faltas de equipa: {f.faltas[0]} a {f.faltas[1]}">
					<span class="n {estadoDasFaltas(f.faltas[0])}">{f.faltas[0]}</span>
					<Icone nome="falta" tamanho={14} />
					<span class="n {estadoDasFaltas(f.faltas[1])}">{f.faltas[1]}</span>
				</span>
			{/if}
		</span>
		<svelte:element this={f.categoria ? 'a' : 'span'} class="emb"
			href={f.categoria ? caminhoEquipa(f.fora, f.categoria) : null}
			aria-label={f.categoria ? `Ver ${f.fora}` : null}>
			<Emblema equipa={f.fora} src={data.emblemas[f.fora]} tamanho={44} />
		</svelte:element>
	</div>

	<div class="extras" bind:this={extras}>
		<div class="medida" bind:clientHeight={alturaExtras}>
			<div class="nomes">
				<svelte:element this={f.categoria ? 'a' : 'span'}
					href={f.categoria ? caminhoEquipa(f.casa, f.categoria) : null}>{f.casa}</svelte:element>
				<svelte:element this={f.categoria ? 'a' : 'span'}
					href={f.categoria ? caminhoEquipa(f.fora, f.categoria) : null}>{f.fora}</svelte:element>
			</div>

			{#if temMarcadores}
				<div class="marcadores">
					<ul>{#each marcadores.casa as m, i (i)}<li>{m}</li>{/each}</ul>
					<ul>{#each marcadores.fora as m, i (i)}<li>{m}</li>{/each}</ul>
				</div>
			{/if}

			<!-- W7.3: o caminho de volta à competição, dentro do herói. Abre na série deste jogo,
			     que é a que a linha nomeia — a classificação dela, e não a das seis séries. -->
			<a class="prova" href={f.grupo_id
				? `/competicoes/${f.grupo_id}${f.serie ? `?serie=${encodeURIComponent(f.serie)}` : ''}`
				: '/competicoes'}>
				<!-- o escalão saiu daqui para cima do resultado; aqui fica a prova -->
				<span class="texto">
					<span class="nome">{nomeProva(provaCurta)}</span>
				</span>
				<span class="jornada">
					{f.serie ? `Série ${f.serie}` : ''}{#if f.serie && f.jornada}&nbsp;·&nbsp;{/if}{f.jornada ?? ''}
					<span class="seta" aria-hidden="true">→</span>
				</span>
			</a>
		</div>
	</div>
</article>

{#if temSeparadores}
	<!-- Dentro do cromado, para ficarem sempre agarrados ao herói e nunca passarem por baixo
	     dele. -->
	<Separadores {separadores} activo={tab} escolher={(v) => (tab = v)} />
{/if}
</div>
</div>

<!-- No separador do directo esta nota não vem a propósito nenhum: quem está a ver o jogo não
     está à espera do onze, e a frase aparecia por cima do vídeo. -->
{#if semFicha && tab !== 'directo'}
	<p class="semFicha">
		{#if f.golos_casa !== null}
			A ficha deste jogo não foi publicada pela fonte. O resultado vem da lista de jogos.
		{:else}
			O onze, os golos e o boletim aparecem aqui quando o jogo começar. Até lá, a fonte
			ainda não publicou a ficha.
		{/if}
	</p>
{/if}

{#if temSeparadores}
	<!-- A mesma faixa que troca de dia na lista de jogos: o separador segue o dedo em vez
	     de saltar quando ele se levanta. -->
	<Faixa itens={abas} bind:escolhido={tab}>
		{#snippet pagina(aba)}
			{#if aba === 'directo'}
				<!-- **Só se monta quando é o separador escolhido.** A `Faixa` desenha as
				     páginas todas para o dedo poder arrastar entre elas, e sem este `tab ===`
				     o `<iframe>` nascia em cada visita à ficha — puxando a transmissão de
				     outra gente para quem nem a quis ver. -->
				{#if directo && tab === 'directo'}
					<Directo {directo} casa={f.casa} fora={f.fora} />
				{/if}
			{:else if aba === 'eventos'}
				<Cronologia eventos={f.cronologia} casa={f.casa} fora={f.fora}
					omitidos={f.individuais_omitidos ?? false} />
			{:else if aba === 'merito'}
				{#if contas}
					<MeritoDoJogo casa={contas.casa} fora={contas.fora} emblemas={data.emblemas} />
				{/if}
			{:else if aba === 'tabela'}
				<!-- Nos Escolares e nos Benjamins a classificação **é** o Mérito do Artigo 92.º,
				     e não uma tabela de pontos. Medido a 21/10/2026: das 37 provas publicadas, 8
				     têm só Mérito, 23 só pontos e nenhuma tem as duas. -->
				{#if oQueMostrar === 'merito'}
					<TabelaMerito linhas={merito!.linhas} emblemas={data.emblemas}
						categoria={f.categoria ?? ''}
						destaque={(e) => e === f.casa || e === f.fora} />
					<LegendaMerito porConfirmar={meritoPorConfirmar}
						semBoletim={merito!.jogos_sem_boletim} />
				{:else}
					{#each grupos as g (g.nome ?? '')}
						{#if g.linhas.length}
							{#if g.nome}<h2 class="serie">{g.nome}</h2>{/if}
							<TabelaClassificacao linhas={g.linhas} emblemas={data.emblemas}
								categoria={f.categoria ?? ''} legenda={false}
								destaque={(e) => e === f.casa || e === f.fora} />
						{/if}
					{/each}
					<LegendaClassificacao />
					{#if tabela.calculada}<RotuloCalculada />{/if}
				{/if}
			{:else if aba === 'equipas'}
				{#if porComecar}
					<p class="aviso">
						Este jogo ainda não começou. Esta é a <strong>convocatória</strong> publicada
						pela associação, e pode mudar até ao apito inicial.
					</p>
				{/if}
				<FichaEquipas equipas={f.equipas} {porComecar} />
			{:else if aba === 'info'}
				<InfoJogo {f} {morada} {linkMapa} />
			{/if}
		{/snippet}
	</Faixa>
{:else}
	<p class="vazio">Este jogo não tem detalhe publicado.</p>
{/if}

<style>
	/* ---------------------------------------------------------------- o herói */
	/* a reserva guarda o espaço; o cromado é o que cola ao topo e encolhe */
	.reserva { margin: calc(var(--e-4) * -1) -0.9rem var(--e-4); }
	.cromado {
		position: sticky;
		top: var(--topo, 60px);
		z-index: 9;
	}
	/*
	  `sticky` só segura dentro da reserva, e a reserva acaba exactamente quando o colapso
	  acaba — a partir daí o cromado ia-se embora com ela. Ao chegar ao fim passa a `fixed`,
	  no mesmo sítio onde o `sticky` o tinha deixado, por isso a troca não se vê. E como a
	  reserva mantém a altura, o conteúdo encosta-lhe por baixo sem salto.
	*/
	.cromado.fixo {
		position: fixed;
		top: var(--topo, 60px);
		left: 50%;
		transform: translateX(-50%);
		width: min(100vw, calc(44rem + 1.8rem));
	}
	.heroi {
		padding: calc(var(--e-4) - var(--k) * 6px) var(--e-4) calc(var(--e-3) - var(--k) * 2px);
		background: var(--heroi);
		color: var(--heroi-texto);
		border-bottom: 1px solid var(--heroi-borda);
		text-align: center;
	}
	/* Absoluta: num bloco centrado, `margin-right: auto` não encosta nada à esquerda.
	   Fica visível também no estado colapsado — se desaparecesse, de lá não havia como
	   voltar atrás sem sair da página. */
	.voltar {
		position: absolute; left: var(--e-1); top: calc(var(--e-1) - var(--k) * 2px);
		display: inline-flex; align-items: center; justify-content: center;
		width: 44px; height: 44px;
		font-size: var(--t-destaque); text-decoration: none;
		color: var(--heroi-texto);
	}

	/* o espaço entre os emblemas fecha-se com o colapso, para o resultado ficar compacto */
	/* uma linha só, compacta, que sobrevive ao colapso do cabeçalho */
	.escalaoTopo {
		display: inline-flex; align-items: center; gap: var(--e-2);
		margin-bottom: calc(var(--e-2) - var(--k) * 2px);
		font-size: var(--t-micro); letter-spacing: 0.06em; font-weight: 600;
		color: var(--heroi-suave); text-decoration: none;
	}
	.escalaoTopo:hover span, .escalaoTopo:focus-visible span { color: var(--heroi-texto); }

	.placar {
		display: flex; align-items: center; justify-content: center;
		gap: calc(var(--e-4) + (1 - var(--k)) * 2.2rem);
	}
	/* a Emblema fixa width/height em linha; aqui a medida tem de variar com o colapso */
	.emb { display: inline-flex; flex: 0 0 auto;
		width: calc(44px - var(--k) * 20px); height: calc(44px - var(--k) * 20px); }
	.emb :global(img), .emb :global(.iniciais) { width: 100% !important; height: 100% !important; }

	.centro { display: flex; flex-direction: column; align-items: center; gap: 1px; }
	.numeros {
		padding: 0 var(--e-2); margin: 0 calc(var(--e-2) * -1);
		font-size: calc(var(--t-placar) - var(--k) * 0.75rem);
		font-weight: 700; line-height: 1.1;
		font-variant-numeric: tabular-nums;
	}
	.tr { color: var(--heroi-suave); margin: 0 var(--e-1); font-weight: 400; }
	.estado {
		display: inline-flex; align-items: center; gap: var(--e-1);
		font-size: var(--t-pequeno); color: var(--heroi-suave);
		font-variant-numeric: tabular-nums;
	}
	.estado.vivo { color: var(--vivo); font-weight: 600; }
	/* ── As faltas de equipa, debaixo do resultado ─────────────────────────────────────────
	   Vermelho porque é a única coisa deste cabeçalho que é um risco e não um facto: os golos
	   são o que aconteceu, as faltas são o que está prestes a acontecer.

	   **Fundo âmbar às 9, vermelho cheio a partir das 10**, e não a piscar. O dono deu as duas
	   hipóteses — "amarelo ou a piscar" — e o âmbar ganha por uma razão prática: isto vive num
	   ecrã onde se está cinquenta minutos a olhar, e uma coisa a piscar esse tempo todo é
	   hostil para quem tem de a ignorar. Com `prefers-reduced-motion` teria de parar de piscar
	   de qualquer maneira, e aí ficaria só a cor — que é esta. */
	.faltas {
		display: inline-flex; align-items: center; justify-content: center; gap: var(--e-2);
		margin-top: var(--e-1);
		font-size: var(--t-micro);
		font-variant-numeric: tabular-nums;
	}
	/* **A mão ao meio, e um número de cada lado.** O dono apanhou a primeira versão, que
	   tinha a palavra "FALTAS" à esquerda e os dois números colados a seguir: *"isso não faz
	   sentido, pois ficam desfasadas de cada equipa"*. Tinha razão — o resultado em cima alinha
	   casa à esquerda e fora à direita, e os números das faltas estavam os dois à direita do
	   meio. Com o apito no centro, cada contador cai debaixo da sua equipa e dispensa rótulo:
	   o símbolo diz o que são.

	   O apito foi a primeira tentativa e o dono recusou-o: a 13 px lia-se como um megafone. A
	   mão aberta ganhou de seis candidatos vistos lado a lado — e ganha sobretudo porque a
	   cronologia já marca as faltas de equipa com ✋, logo é a mesma silhueta no mesmo ecrã. */
	.faltas :global(svg) { color: var(--heroi-suave); flex: 0 0 auto; }
	.faltas .n {
		min-width: 1.35rem; padding: 1px 4px; border-radius: 4px;
		text-align: center; font-weight: 600; color: var(--directo);
	}
	.faltas .n.alerta { background: var(--aviso-fundo); color: var(--aviso); }
	.faltas .n.atingido { background: var(--directo); color: #fff; }

	.estado i {
		width: 6px; height: 6px; border-radius: 50%; background: var(--vivo);
		animation: pulsar 1.6s ease-in-out infinite;
	}
	@keyframes pulsar { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
	@media (prefers-reduced-motion: reduce) { .estado i { animation: none; } }

	/* o que se fecha: nomes, golos e competição. `--k` vai de 0 a 1 com o scroll. */
	.extras {
		max-height: calc((1 - var(--k)) * var(--alt, 0px));
		opacity: calc(1 - var(--k) * 1.8);
		overflow: hidden;
	}
	/* invólucro não constrangido: é dele que se mede a altura natural */
	.medida { padding-top: var(--e-3); }

	.nomes {
		display: grid; grid-template-columns: 1fr 1fr; gap: var(--e-3);
		font-size: var(--t-base);
	}
	.nomes > :global(*) {
		overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
		text-decoration: none; color: inherit;
	}
	.nomes > :global(a:hover), .nomes > :global(a:focus-visible) { text-decoration: underline; }

	/* uma coluna por equipa, debaixo dela: assim não é preciso ler números para saber
	   de quem é cada golo */
	.marcadores {
		display: grid; grid-template-columns: 1fr 1fr; gap: var(--e-3);
		margin-top: var(--e-3);
	}
	.marcadores ul {
		list-style: none; margin: 0; padding: 0;
		font-size: var(--t-pequeno); color: var(--heroi-suave);
		display: flex; flex-direction: column; gap: 2px;
	}
	.marcadores li {
		overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
	}

	/* a ligação para a competição, dentro do herói */
	.prova {
		display: flex; align-items: center; justify-content: space-between; gap: var(--e-3);
		margin: var(--e-3) calc(var(--e-4) * -1) 0;
		padding: var(--e-3) var(--e-4) 0;
		border-top: 1px solid var(--heroi-borda);
		text-decoration: none; color: var(--heroi-texto); text-align: left;
	}
	.prova .texto { display: flex; flex-direction: column; min-width: 0; }
	.prova .nome {
		font-size: var(--t-pequeno);
		overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
	}
	.prova .jornada {
		display: inline-flex; align-items: center; gap: var(--e-2);
		font-size: var(--t-pequeno); color: var(--heroi-suave); white-space: nowrap;
	}

	/* ------------------------------------------------------------- separadores */
	/* Colados por baixo do herói, que muda de altura ao colapsar — daí a altura vir
	   medida e não escrita à mão. Nunca ficam escondidos. */
	/* o desenho dos separadores vive no `lib/Separadores.svelte`, igual em todos os ecrãs */

	/* Uma nota e não um aviso: nada está mal, há só uma coisa que ainda não aconteceu. Por
	   isso sem amarelo e sem ícone de alerta — a lição da caixa das classificações
	   calculadas, que o dono apanhou no telemóvel a 07/10: o aviso afastava a atenção da
	   tabela, que era o que ele tinha ido ver. */
	.semFicha {
		margin: 0.6rem 0.2rem 0;
		font-size: 0.76rem;
		line-height: 1.5;
		color: var(--suave);
	}

	.serie {
		font-size: var(--t-micro); letter-spacing: 0.05em; text-transform: uppercase;
		color: var(--suave); margin: var(--e-5) 0 var(--e-2);
	}
	.aviso {
		margin: 0 0 var(--e-4); padding: var(--e-3) var(--e-4);
		font-size: var(--t-pequeno); line-height: 1.45;
		border-radius: var(--raio); background: var(--aviso-fundo); color: var(--aviso);
	}
	.vazio { color: var(--suave); font-size: var(--t-base); }
</style>
