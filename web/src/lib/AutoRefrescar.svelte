<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { emCurso } from '$lib/formato';
	import type { JogoAgenda } from '$lib/tipos';

	let { agenda }: { agenda: JogoAgenda[] } = $props();

	/** Com um jogo a decorrer, de 30 em 30 s; com jogos marcados para hoje, de 5 em 5 min. */
	const AO_VIVO_MS = 30_000;
	const ESPERA_MS = 5 * 60_000;

	const hoje = new Date().toISOString().slice(0, 10);
	const temVivo = $derived(agenda.some(emCurso));
	/** Há jogos hoje cuja hora já passou e que ainda não acabaram? Então um pode começar
	 *  a qualquer momento, e sem este ritmo lento nunca descobríamos o primeiro golo. */
	const diaDeJogos = $derived(agenda.some((j) => j.data === hoje));

	$effect(() => {
		if (!diaDeJogos) return;
		const periodo = temVivo ? AO_VIVO_MS : ESPERA_MS;

		// Só com o ecrã à frente. Um telemóvel no bolso a pedir dados de 30 em 30 segundos
		// gasta bateria para nada, e numa bancada a bateria é o recurso escasso — hoje o
		// telefone do dono do projecto estava a 32%.
		const puxar = () => {
			if (document.visibilityState !== 'visible') return;
			invalidate((url) => url.pathname.endsWith('/agenda.json'));
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
