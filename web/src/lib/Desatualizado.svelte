<script lang="ts">
	let { geradoEm }: { geradoEm: string } = $props();

	// `generated_at` marca a última vez que os DADOS mudaram, não a última verificação:
	// o cron corre de 2 em 2 horas mas só publica quando há novidade nos jogos.
	// Por isso "há 3 dias" numa terça-feira é normal — a APL joga ao fim-de-semana.
	// Acima de uma semana já não é: aí alguma coisa está partida.
	const horas = $derived((Date.now() - new Date(geradoEm).getTime()) / 36e5);
	const dias = $derived(Math.round(horas / 24));
	const rotulo = $derived(
		horas < 1 ? 'agora mesmo'
			: horas < 24 ? `há ${Math.round(horas)}h`
			: `há ${dias} dia${dias === 1 ? '' : 's'}`
	);
</script>

<span class="idade" class:velho={horas > 24 * 7} title={`Últimos dados novos: ${geradoEm}`}>
	{rotulo}
</span>

<style>
	.idade { font-size: 0.72rem; color: var(--suave); white-space: nowrap; }
	.velho { color: var(--aviso); background: var(--aviso-fundo);
		padding: 0.12rem 0.4rem; border-radius: 999px; }
</style>
