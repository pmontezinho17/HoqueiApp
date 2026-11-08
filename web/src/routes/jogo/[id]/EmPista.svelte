<script lang="ts">
	/**
	 * O separador "Em pista" (07/11/2026). O que mostrar vive em `$lib/emPista`, que é onde os
	 * testes lhe chegam; aqui é só o desenho que o dono escolheu entre quatro simulações nesse
	 * dia — a grelha do plantel com a barra de cada atleta, e os golos em número.
	 */
	import { nomeProprio } from '$lib/formato';
	import type { EquipaNaPista } from '$lib/emPista';

	let { equipas }: { equipas: EquipaNaPista[] } = $props();

	const primeiro = (n: string) => nomeProprio(n).split(' ')[0];
	/** primeiro e último nome: a 375px a coluna do nome tem uns 100px, e "Duarte Lobo da Silva
	 *  Ferreira" partia-se em "Duarte Lob…" — já se viu na simulação de 07/11/2026 */
	const curto = (n: string) => {
		const p = nomeProprio(n).split(/\s+/);
		return p.length > 2 ? `${p[0]} ${p[p.length - 1]}` : p.join(' ');
	};
</script>

{#each equipas as e (e.equipa)}
	<section>
		<h3>{e.equipa}</h3>
		<p class="resumo" class:ok={e.semAsDuasPartes === 0}>
			{e.linhas.length} atletas ·
			{#if e.semAsDuasPartes === 0}
				todos jogaram nas duas partes
			{:else}
				{e.semAsDuasPartes} sem uma meia parte em cada parte
			{/if}
		</p>
		{#each e.entradas as en (en.nome + en.periodo)}
			<!-- o mesmo amarelo e a mesma explicação do separador do Mérito -->
			<p class="entrada">
				<b class="letra">J</b>
				<span><b>{primeiro(en.nome)} entrou a meio do {en.periodo}º período.</b> Conta como meia
					parte jogada e pesa no Mérito.</span>
			</p>
		{/each}

		<div class="grelha" role="table" aria-label={`Em pista — ${e.equipa}`}>
			<div class="linha cabeca" role="row">
				<span></span><span></span>
				<span class="parte">1ª parte</span><span></span><span class="parte">2ª parte</span>
				<span class="total">Golos</span>
			</div>
			<div class="linha periodos" role="row">
				<span></span><span></span>
				<span>1º</span><span>2º</span><span></span><span>3º</span><span>4º</span><span></span>
			</div>
			{#each e.linhas as l, i (i)}
				<div class="linha atleta" role="row">
					<span class="num">{l.numero ?? ''}</span>
					<span class="nome" title={nomeProprio(l.nome)}><span class="t">{curto(l.nome)}</span>{#if l.gr}<small>GR</small>{/if}</span>
					{#each l.periodos as p, k (k)}
						{#if k === 2}<span></span>{/if}
						<span class="bloco {p.estado}"
							aria-label={`${k + 1}º período: ${p.estado === 'jogou' ? 'jogou' : p.estado === 'entrou' ? 'entrou a meio' : 'não jogou'}${p.golos ? `, ${p.golos} golo${p.golos > 1 ? 's' : ''}` : ''}`}
						>
							{#if p.estado === 'entrou'}<b class="j">J</b>{/if}
							{#if p.golos}<span class="golos"><i class="bola"></i>{#if p.golos > 1}{p.golos}{/if}</span>{/if}
						</span>
					{/each}
					<span class="total" class:zero={!l.golos}>{l.golos === null ? '' : l.golos || '–'}</span>
				</div>
			{/each}
			<p class="legenda">
				<span><i class="amostra jogou"></i> jogou o período</span>
				<span><i class="amostra entrou"></i> entrou a meio (J)</span>
				<span><i class="bola legenda-bola"></i>3 = três golos nesse período</span>
			</p>
		</div>
	</section>
{/each}

<style>
	section + section { margin-top: var(--e-5, 20px); }
	h3 { font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--suave);
		margin: 0 0 var(--e-2, 6px); }
	.resumo { font-size: var(--t-pequeno); color: var(--suave); background: var(--cartao);
		border: 1px solid var(--borda); border-radius: var(--raio); padding: 5px 9px; margin: 0 0 6px; }
	.resumo.ok { color: var(--acento); background: var(--acento-fraco); border-color: transparent; }
	.resumo.ok::before { content: '✓ '; }
	.entrada { display: flex; gap: 8px; align-items: flex-start; font-size: var(--t-pequeno);
		color: var(--aviso); background: var(--aviso-fundo); border-radius: var(--raio);
		padding: 6px 10px; margin: 0 0 6px; }
	.letra { flex: none; width: 18px; height: 18px; border-radius: 50%; background: var(--j-fundo);
		display: inline-flex; align-items: center; justify-content: center; font-size: 0.68rem; }

	.grelha { background: var(--cartao); border: 1px solid var(--borda); border-radius: var(--raio-cartao);
		padding: 4px 10px; margin-top: 8px; }
	.linha { display: grid; align-items: center; gap: 3px;
		grid-template-columns: 1.3rem minmax(0, 1fr) repeat(2, 2.3rem) 4px repeat(2, 2.3rem) 1.7rem; }
	.cabeca, .periodos { font-size: var(--t-micro); color: var(--suave); text-align: center; }
	.cabeca { padding-top: 4px; }
	.cabeca .parte { grid-column: span 2; }
	.periodos { padding-bottom: 4px; border-bottom: 1px solid var(--borda); }
	.total { text-align: right; }
	.atleta { padding: 6px 0; }
	.atleta + .atleta { border-top: 1px solid var(--borda); }
	.num { color: var(--suave); font-size: 0.75rem; font-variant-numeric: tabular-nums; }
	.nome { display: flex; align-items: baseline; min-width: 0; font-size: 0.82rem; font-weight: 600; }
	.nome .t { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	/* fora do corte: o GR é o que distingue os dois guarda-redes, e era o primeiro a sumir */
	.nome small { flex: none; font-size: 0.6rem; color: var(--suave); font-weight: 600; margin-left: 4px; }
	.atleta .total { font-size: 0.82rem; font-weight: 700; font-variant-numeric: tabular-nums; }
	.atleta .total.zero { color: var(--suave); font-weight: 400; }

	.bloco { height: 18px; border-radius: 5px; display: flex; align-items: center; justify-content: center;
		gap: 3px; padding: 0 4px; box-sizing: border-box; }
	.bloco.fora { background: var(--borda); opacity: 0.6; }
	.bloco.jogou { background: var(--acento); color: var(--cartao); }
	/* bloco inteiro a amarelo, por escolha do dono a 08/11/2026: o meio bloco da simulação lia-se
	   como "jogou metade" — e a ficha não diz a que minuto entrou, só que entrou */
	.bloco.entrou { background: var(--j-fundo); color: var(--aviso); }
	.j { font-size: 0.58rem; }
	/* uma bola clara no verde: a bola escura dos eventos quase não se via lá dentro */
	.bola { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
	.legenda-bola { background: var(--texto); }
	.golos { display: inline-flex; align-items: center; gap: 2px; font-size: 0.7rem; font-weight: 800;
		font-variant-numeric: tabular-nums; }

	.legenda { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: var(--t-micro); color: var(--suave);
		border-top: 1px solid var(--borda); margin: 0; padding: 8px 0 4px; }
	.legenda span { display: inline-flex; align-items: center; gap: 4px; }
	.amostra { display: inline-block; width: 18px; height: 9px; border-radius: 3px; }
	.amostra.jogou { background: var(--acento); }
	.amostra.entrou { background: var(--j-fundo); }
</style>
