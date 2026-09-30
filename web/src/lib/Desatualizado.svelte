<script lang="ts">
	let { geradoEm }: { geradoEm: string } = $props();

	// W3.12: o utilizador tem de conseguir distinguir "não houve golos" de "o backend parou".
	const horas = $derived((Date.now() - new Date(geradoEm).getTime()) / 36e5);
	const rotulo = $derived(
		horas < 1 ? 'agora mesmo'
			: horas < 24 ? `há ${Math.round(horas)}h`
			: `há ${Math.round(horas / 24)} dias`
	);
</script>

<span class="idade" class:velho={horas > 24} title={`Dados actualizados ${geradoEm}`}>
	{rotulo}
</span>

<style>
	.idade { font-size: 0.72rem; color: var(--suave); white-space: nowrap; }
	.velho { color: var(--aviso); background: var(--aviso-fundo);
		padding: 0.12rem 0.4rem; border-radius: 999px; }
</style>
