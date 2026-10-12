<script lang="ts">
	/**
	 * A transmissão em directo, embebida — e a saída para quando ela não embeber.
	 *
	 * **Embeber foi medido antes de ser escolhido**, a 10/10/2026, com o jogo a decorrer: a
	 * página do XbotGo não manda `X-Frame-Options` nem `Content-Security-Policy`, e dentro de
	 * um `<iframe>` carrega e toca. O dono perguntou se era opção válida; é, e o teste está
	 * nos comentários do backlog com o que se viu no ecrã.
	 *
	 * **Mas é o sítio de outra gente.** Basta eles acrescentarem um cabeçalho, mudarem o
	 * endereço ou partirem a sala para isto passar a ser um rectângulo branco — e um
	 * rectângulo branco num sábado, com o jogo a decorrer, é pior do que nunca ter havido
	 * separador. Por isso o botão de abrir no sítio original **não é um fallback escondido**:
	 * está sempre lá, por baixo do vídeo, antes de alguém precisar dele.
	 *
	 * O `<iframe>` só é montado quando alguém escolhe este separador — ver o `{#if}` na
	 * página do jogo. Sem isso, cada visita à ficha deste jogo puxava a transmissão deles,
	 * incluindo as de quem nunca a quis ver.
	 *
	 * ## Porque é que a janela está cortada em baixo
	 *
	 * A página do XbotGo tem, por baixo do leitor, um bloco "Configuração do host" com o
	 * **email de quem está a transmitir** — meio tapado por asteriscos, mas lá está. Visto no
	 * primeiro ensaio, a 10/10/2026, dentro da nossa app e a 375 px.
	 *
	 * Esse email é de uma pessoa, não é informação do jogo, e nada neste ecrã justifica
	 * mostrá-lo. A janela mostra o cabeçalho deles e o leitor, e corta aí. O cabeçalho com a
	 * marca **fica**: cortá-lo seria passar por nossa uma transmissão que não é, e a nota por
	 * baixo diz de quem é em palavras.
	 */
	import Icone from '$lib/Icone.svelte';
	import type { Directo } from '$lib/directos';

	let { directo, casa, fora }: { directo: Directo; casa: string; fora: string } = $props();
</script>

<div class="caixa">
	<iframe
		src={directo.url}
		title="{casa} – {fora}, transmissão em directo por {directo.fonte}"
		allow="autoplay; fullscreen; picture-in-picture"
		allowfullscreen
		referrerpolicy="no-referrer"
		loading="lazy"
		scrolling="no"
	></iframe>
</div>

<p class="nota">
	Transmissão de <strong>{directo.fonte}</strong>, mostrada aqui tal como está no site deles.
	Não é nossa, não a gravamos, e pode parar sem aviso.
</p>

<a class="fora" href={directo.url} target="_blank" rel="noopener noreferrer">
	<Icone nome="directo" tamanho={18} />
	Abrir no site do {directo.fonte}
</a>

<style>
	/* A altura **segue a largura**, porque o leitor deles é 16:9: `56.25%` é esse rácio, e os
	   60 px são a faixa da marca que fica por cima dele e que não encolhe com o ecrã.
	   Medido a 375 px: 60 + 211 = 271, que é exactamente onde o vídeo acaba.

	   O `<iframe>` é mais alto do que a caixa de propósito. Assim a página deles desenha-se
	   na altura normal — não reflui por estar apertada — e nós mostramos só o cimo. É isto
	   que deixa o bloco com o email do host de fora. */
	.caixa {
		position: relative;
		width: 100%;
		height: 0;
		padding-bottom: calc(56.25% + 60px);
		border-radius: 12px;
		overflow: hidden;
		background: #000;
		border: 1px solid var(--borda);
	}
	iframe {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 900px;
		border: 0;
		display: block;
	}
	.nota {
		margin: var(--e-2) 0 0;
		font-size: var(--t-micro);
		color: var(--suave);
		line-height: 1.45;
	}
	.nota strong { color: var(--texto-2); font-weight: 600; }
	.fora {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		min-height: 44px;
		margin-top: var(--e-2);
		border: 1px solid var(--borda);
		border-radius: 10px;
		font-size: var(--t-micro);
		font-weight: 600;
		color: var(--acento);
		text-decoration: none;
	}
</style>
