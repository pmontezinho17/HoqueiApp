<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { diaDeLisboa, instanteDeLisboa } from '$lib/dia';
	import type { JogoAgenda } from '$lib/tipos';

	let { agenda }: { agenda: JogoAgenda[] } = $props();

	/** Dentro da janela de um jogo, de 30 em 30 s; com jogos marcados para hoje, de 5 em 5 min. */
	const AO_VIVO_MS = 30_000;
	const ESPERA_MS = 5 * 60_000;
	/** A janela de um jogo: dos 20 min antes do apito às 3 h depois. */
	const ANTES_MS = 20 * 60_000;
	const DEPOIS_MS = 3 * 60 * 60_000;

	/**
	 * O ritmo sai da **hora marcada** e não da marca de "a decorrer".
	 *
	 * A versão anterior perguntava `agenda.some(emCurso)`, e isso é um impasse: a marca
	 * `ao_vivo` só aparece na agenda quando um refrescamento a traz, e o refrescamento só é
	 * de 30 em 30 segundos se a marca já lá estiver. Quem abrisse a app antes do apito
	 * ficava no ritmo lento durante os primeiros cinco minutos de jogo — que são
	 * precisamente aqueles em que se está a olhar para o ecrã.
	 *
	 * A hora marcada já vem na agenda do arranque e não depende de nada, por isso serve de
	 * relógio fiável: 20 minutos antes já há convocatória para ir buscar, e três horas
	 * depois até o jogo mais esticado acabou.
	 *
	 * `agora` é reavaliado de minuto a minuto para a janela abrir e fechar sozinha, sem
	 * precisar de uma navegação.
	 */
	let agora = $state(Date.now());
	$effect(() => {
		const t = setInterval(() => (agora = Date.now()), 60_000);
		return () => clearInterval(t);
	});

	// a hora marcada é de Lisboa, e não a do aparelho: ver `instanteDeLisboa`
	const inicioDe = (j: JogoAgenda) => (j.hora ? instanteDeLisboa(j.data, j.hora) : null);

	const naJanela = $derived(
		agenda.some((j) => {
			const i = inicioDe(j);
			return i !== null && agora >= i - ANTES_MS && agora <= i + DEPOIS_MS;
		})
	);

	// O dia de Lisboa, e não o do aparelho nem o de UTC. Era a data local, e essa já tinha
	// corrigido o `toISOString()` — que no verão escreve um jogo às 23:30 no dia seguinte e fez a
	// ronda ao vivo sair cedo a 05/10. Mas a data local só é a de Lisboa em Portugal; fora, a 31/10,
	// era o fuso do telemóvel do dono a decidir que dia era hoje.
	const hoje = $derived(diaDeLisboa(new Date(agora)));
	const diaDeJogos = $derived(agenda.some((j) => j.data === hoje));

	$effect(() => {
		if (!diaDeJogos && !naJanela) return;
		const periodo = naJanela ? AO_VIVO_MS : ESPERA_MS;

		// Só com o ecrã à frente. Um telemóvel no bolso a pedir dados de 30 em 30 segundos
		// gasta bateria para nada, e numa bancada a bateria é o recurso escasso — hoje o
		// telefone do dono do projecto estava a 32%.
		const puxar = () => {
			if (document.visibilityState !== 'visible') return;
			// A agenda alimenta as listas; a ficha alimenta o ecrã do jogo, com a cronologia.
			// Só com a agenda, quem estivesse **dentro** de um jogo a decorrer — que é onde
			// se está numa bancada — não via nada mexer.
			invalidate((url) =>
				url.pathname.endsWith('/agenda.json') || url.pathname.includes('/match/'));
		};

		const t = setInterval(puxar, periodo);
		// ao voltar para a app, actualizar já em vez de esperar pelo próximo intervalo
		document.addEventListener('visibilitychange', puxar);
		return () => {
			clearInterval(t);
			document.removeEventListener('visibilitychange', puxar);
		};
	});
</script>
