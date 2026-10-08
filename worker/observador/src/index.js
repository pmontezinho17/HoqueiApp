/**
 * O observador: mede uma janela de jogos pelo lado de quem usa a app, na nuvem.
 *
 * Havia um `scripts/observar.py` a fazer isto no portátil do dono, e isso não é um teste a
 * sério: se o Mac adormece, a medição morre e ficamos sem saber. Isto corre na Cloudflare, de
 * minuto a minuto, esteja quem estiver acordado.
 *
 * **Worker à parte, e não dentro do `relogio`.** O relógio é a peça que mantém a app viva ao
 * fim de semana — é ele que acorda a ronda ao vivo quando o agendador da GitHub não o faz. Um
 * defeito neste observador não pode parar aquele.
 *
 * ## O que mede, e o que não mede
 *
 * Lê **só o que nós publicamos**: `meta.json` e `agenda.json` do nosso CDN. Nunca toca na
 * APL — uma segunda coisa a raspar seria exactamente o que a Decisão 1 proíbe, e a fonte é o
 * servidor de uma associação.
 *
 * A consequência honesta: **não** diz quanto tempo um golo demora desde que é marcado. Isso
 * exige alguém no pavilhão com um cronómetro, como se mediu a 03/10/2026 (~20 s da mesa +
 * ~15 s nossos). O que mede são as falhas que já nos morderam:
 *
 * | o que se registra | a falha que apanha |
 * |---|---|
 * | `publicacao` | o ciclo ao vivo parado a meio de um jogo |
 * | `resultado` | se os golos aparecem, e com que intervalo |
 * | `ao_vivo` | a marca presa horas depois do apito final |
 * | `erro` | o CDN a responder mal |
 *
 * ## Porque é que não escreve a cada minuto
 *
 * O KV gratuito dá **1 000 escritas por dia**, partilhadas com o contador de utilização. Por
 * isso só se escreve quando **algo mudou**: a leitura de cada minuto custa uma leitura (há
 * 100 000) e a escrita só acontece se houver evento novo. Numa noite de jogos isso são ~300
 * escritas no pior caso — uma por minuto, quando a ronda ao vivo está a publicar sem parar.
 */

import { pagina } from './pagina.js';

const BASE = 'https://hoquei.pages.dev/v1/aplisboa/2026-27';
const UA = 'hoqueiAPP-observador/1.0 (+https://github.com/pmontezinho17/HoqueiApp)';

/** `sv-SE` dá "2026-10-08 19:30": ISO sem montar a data campo a campo, e com o fuso certo. */
export function emLisboa(quando = new Date()) {
	const s = quando.toLocaleString('sv-SE', { timeZone: 'Europe/Lisbon' });
	return { dia: s.slice(0, 10), hora: s.slice(11, 19) };
}

async function ler(caminho) {
	const r = await fetch(`${BASE}/${caminho}`, {
		headers: { 'User-Agent': UA },
		// sem isto a própria Cloudflare serve-nos a cópia em cache e mediríamos a cache,
		// não a publicação
		cache: 'no-store'
	});
	if (!r.ok) throw new Error(`${caminho}: HTTP ${r.status}`);
	return r.json();
}

/** O estado que interessa de cada jogo de hoje, achatado para comparar. */
export function retrato(agenda, dia) {
	const jogos = Array.isArray(agenda) ? agenda : agenda.jogos ?? [];
	const r = {};
	for (const j of jogos) {
		if (j.data !== dia || !j.id) continue;
		r[j.id] = {
			h: (j.hora ?? '').slice(0, 5),
			c: j.casa,
			f: j.fora,
			gc: j.gc ?? null,
			gf: j.gf ?? null,
			v: !!j.ao_vivo,
			s: j.situacao ?? null
		};
	}
	return r;
}

/**
 * Os eventos entre dois retratos.
 *
 * Função pura, e separada do Worker de propósito: é o que o `teste.mjs` pode exercitar sem
 * rede nem KV.
 */
export function diferencas(antes, depois, carimboAntes, carimboDepois) {
	const ev = [];
	if (carimboDepois && carimboDepois !== carimboAntes) {
		ev.push({ tipo: 'publicacao', generated_at: carimboDepois });
	}
	for (const [id, d] of Object.entries(depois)) {
		const a = antes?.[id];
		if (!a) {
			ev.push({ tipo: 'jogo', id: Number(id), hora: d.h, casa: d.c, fora: d.f });
			continue;
		}
		if (a.gc !== d.gc || a.gf !== d.gf) {
			ev.push({
				tipo: 'resultado',
				id: Number(id),
				de: `${a.gc}-${a.gf}`,
				para: `${d.gc}-${d.gf}`,
				situacao: d.s
			});
		}
		if (a.v !== d.v) ev.push({ tipo: 'ao_vivo', id: Number(id), aceso: d.v, situacao: d.s });
		else if (a.s !== d.s) ev.push({ tipo: 'situacao', id: Number(id), de: a.s, para: d.s });
	}
	return ev;
}

/**
 * A saúde da cadeia **agora**, calculada da agenda que já se leu.
 *
 * É o número que diz se a app está neste instante a mentir a alguém, e é a única coisa aqui
 * que vale a pena interromper o dono para lhe contar. As três regras saíram de falhas reais:
 *
 * * `sem_resultado` — o A STUART HCM–PAREDE FC A das 15h30, a 05/10, ficou sem resultado
 *   até à noite. Duas horas depois do apito inicial um jogo tem de ter resultado;
 * * `ao_vivo_preso` — o HC VASCO GAMA das 12h dizia "2ª Parte (3:41)" às 19h37;
 * * `publicacao_velha` — com jogos a decorrer, o ciclo publica de 30 em 30 segundos. Cinco
 *   minutos de silêncio é o ciclo parado, e foi isso que aconteceu nas tardes em que o
 *   agendador da GitHub não criou corrida nenhuma.
 */
export function saude(agenda, dia, hora, geradoEm, agoraMs = Date.now()) {
	const jogos = Array.isArray(agenda) ? agenda : agenda.jogos ?? [];
	const minutos = (h) => {
		const [a, b] = (h ?? '').split(':').map(Number);
		return Number.isFinite(a) ? a * 60 + (b || 0) : null;
	};
	const agoraMin = minutos(hora);
	const doDia = jogos.filter((j) => j.data === dia && j.hora);

	const semResultado = [];
	const presos = [];
	let aDecorrer = 0;
	for (const j of doDia) {
		const inicio = minutos(j.hora);
		if (inicio === null) continue;
		const decorridos = agoraMin - inicio;
		if (decorridos >= -15 && decorridos <= 180) aDecorrer++;
		if (decorridos > 120 && (j.gc ?? null) === null) semResultado.push(j.id);
		if (decorridos > 180 && j.ao_vivo) presos.push(j.id);
	}

	const idade = geradoEm ? Math.round((agoraMs - Date.parse(geradoEm)) / 60000) : null;
	const publicacaoVelha = aDecorrer > 0 && idade !== null && idade > 5;

	const vermelho = semResultado.length > 0 || presos.length > 0 || publicacaoVelha;
	return {
		estado: vermelho ? 'vermelho' : 'verde',
		jogos_hoje: doDia.length,
		a_decorrer: aDecorrer,
		sem_resultado: semResultado,
		ao_vivo_preso: presos,
		dados_com_minutos: idade,
		publicacao_velha: publicacaoVelha
	};
}

/**
 * Avisar quando a saúde fica vermelha — e só quando **muda**.
 *
 * Uma consola só vale se alguém estiver a olhar, e às 16:00 de sábado ninguém está. Isto é
 * o que protege o fim de semana: três noites seguidas a ronda das 00:30 falhou e o que
 * avisou o dono foi um email, não um painel.
 *
 * **Abre uma issue no repositório**, e a GitHub manda-lhe o email. Não é preguiça: o envio
 * de email da Cloudflare exige um domínio registado no serviço, e o domínio próprio está
 * adiado por decisão dele (B9.27). Este caminho usa um canal que ele já lê — foi por ele
 * que reparou nas falhas das Actions — e não precisa de domínio nenhum.
 *
 * Só avisa na **transição** para vermelho. Um vermelho que dure a tarde toda não abre
 * trezentas issues, e o regresso a verde fecha a que estiver aberta.
 */
async function avisar(env, antes, agora, dia) {
	if (!env.GITHUB_TOKEN) return 'sem token: aviso não enviado';
	const passouAVermelho = antes !== 'vermelho' && agora.estado === 'vermelho';
	const voltouAVerde = antes === 'vermelho' && agora.estado === 'verde';
	if (!passouAVermelho && !voltouAVerde) return null;

	const cabecalhos = {
		'User-Agent': UA,
		Authorization: `Bearer ${env.GITHUB_TOKEN}`,
		Accept: 'application/vnd.github+json',
		'Content-Type': 'application/json'
	};
	const titulo = `Cadeia em vermelho — ${dia}`;
	const api = `https://api.github.com/repos/${env.REPO}/issues`;

	// procura-se a issue deste dia antes de abrir outra
	let aberta = null;
	try {
		const r = await fetch(`${api}?state=open&labels=cadeia&per_page=5`, { headers: cabecalhos });
		if (r.ok) aberta = (await r.json()).find((i) => i.title === titulo) ?? null;
	} catch {
		/* se a procura falhar, abre-se na mesma: um aviso a mais é melhor que nenhum */
	}

	if (passouAVermelho) {
		const corpo = [
			`A ${dia}, às ${emLisboa().hora}, a cadeia passou a vermelho.`,
			'',
			agora.sem_resultado?.length
				? `- **${agora.sem_resultado.length} jogo(s) sem resultado** há mais de 2 h: ${agora.sem_resultado.join(', ')}`
				: null,
			agora.ao_vivo_preso?.length
				? `- **"ao vivo" preso** em: ${agora.ao_vivo_preso.join(', ')}`
				: null,
			agora.publicacao_velha
				? `- **os dados têm ${agora.dados_com_minutos} min** e há ${agora.a_decorrer} jogo(s) na janela`
				: null,
			'',
			`Consola: ${env.CONSOLA ?? 'https://hoquei-observador.torneiopa.workers.dev/'}`,
			'',
			'_Aberto pelo `worker/observador`. Fecha-se sozinho quando voltar a verde._'
		]
			.filter((l) => l !== null)
			.join('\n');
		if (aberta) {
			await fetch(`${api}/${aberta.number}/comments`, {
				method: 'POST', headers: cabecalhos, body: JSON.stringify({ body: corpo })
			});
			return `comentada a issue #${aberta.number}`;
		}
		const r = await fetch(api, {
			method: 'POST',
			headers: cabecalhos,
			body: JSON.stringify({ title: titulo, body: corpo, labels: ['cadeia'] })
		});
		return r.ok ? `issue aberta` : `a issue falhou: HTTP ${r.status}`;
	}

	if (voltouAVerde && aberta) {
		await fetch(`${api}/${aberta.number}`, {
			method: 'PATCH',
			headers: cabecalhos,
			body: JSON.stringify({ state: 'closed' })
		});
		return `issue #${aberta.number} fechada`;
	}
	return null;
}

/**
 * Os pedidos à fonte, distribuídos pelas horas do dia.
 *
 * O `meta.json` traz um total do dia que **só cresce**, acumulado no próprio ficheiro pelo
 * raspador — ver `acumular_pedidos`. Aqui faz-se a diferença entre duas leituras e atribui-se
 * à hora em que se viu. Assim não interessa quantas rondas passaram entre leituras: o que se
 * perdeu numa leitura aparece na seguinte.
 *
 * **Uma descida significa recomeço, não pedidos negativos.** Uma corrida nova parte do
 * ficheiro commitado, que pode ser de há horas e ter um total menor; aí conta-se o valor novo
 * como sendo tudo o que há, em vez de uma diferença negativa.
 */
export function porHora(horasAntes, totalAntes, totalAgora, hora, dia, diaAntes) {
	const horas = dia === diaAntes ? { ...(horasAntes ?? {}) } : {};
	const h = String(Number(hora.slice(0, 2)));
	const antes = (diaAntes === dia && totalAntes) || {};
	const agora = totalAgora || {};
	const balde = { ...(horas[h] ?? {}) };
	let mexeu = false;
	for (const [tipo, n] of Object.entries(agora)) {
		const delta = n >= (antes[tipo] ?? 0) ? n - (antes[tipo] ?? 0) : n;
		if (delta > 0) {
			balde[tipo] = (balde[tipo] ?? 0) + delta;
			mexeu = true;
		}
	}
	if (mexeu) horas[h] = balde;
	return horas;
}

async function observar(env) {
	const { dia, hora } = emLisboa();
	const chaveEstado = 'estado';
	const chaveDia = `obs:${dia}`;

	let estado = {};
	try {
		estado = JSON.parse((await env.OBSERVACAO.get(chaveEstado)) ?? '{}');
	} catch {
		estado = {};
	}
	const anterior = estado;

	let eventos;
	let agoraSaude = null;
	try {
		const [meta, agenda] = await Promise.all([ler('meta.json'), ler('agenda.json')]);
		const agora = retrato(agenda, dia);
		eventos = diferencas(estado.retrato, agora, estado.generated_at, meta.generated_at);
		agoraSaude = saude(agenda, dia, hora, meta.generated_at);
		// só se registra a **transição**: um estado vermelho que durasse uma tarde enchia o
		// registo com a mesma linha trezentas vezes
		if (estado.saude?.estado !== agoraSaude.estado) {
			eventos.push({ tipo: 'saude', ...agoraSaude });
			const r = await avisar(env, estado.saude?.estado, agoraSaude, dia);
			if (r) eventos.push({ tipo: 'aviso', resultado: r });
		}
		// os baldes por hora só avançam quando a ronda é nova: duas leituras da mesma ronda
		// contariam os mesmos pedidos duas vezes
		const rondaNova = meta.generated_at !== estado.generated_at;
		const horas = rondaNova
			? porHora(
					estado.horas,
					estado.pedidos_dia?.por_tipo,
					meta.pedidos_dia?.por_tipo,
					hora,
					dia,
					estado.pedidos_dia?.dia ?? estado.dia
				)
			: (estado.horas ?? {});
		estado = {
			retrato: agora,
			generated_at: meta.generated_at,
			dia,
			saude: agoraSaude,
			pedidos_fonte: meta.pedidos_fonte ?? null,
			pedidos_falhados: meta.pedidos_falhados ?? null,
			pedidos_por_tipo: meta.pedidos_por_tipo ?? null,
			pedidos_dia: meta.pedidos_dia ?? null,
			horas
		};
	} catch (e) {
		eventos = [{ tipo: 'erro', erro: String(e).slice(0, 200) }];
	}

	// o estado grava-se sempre que a leitura correu: é dele que a consola tira "agora". Mas
	// só se escreve se mudou algo que interesse, para não gastar as 1 000 escritas do dia.
	if (!eventos.length) {
		const mudou = JSON.stringify(estado.saude) !== JSON.stringify(anterior?.saude)
			|| estado.generated_at !== anterior?.generated_at;
		if (mudou && estado.retrato) {
			await env.OBSERVACAO.put(chaveEstado, JSON.stringify(estado),
				{ expirationTtl: 60 * 60 * 24 * 90 });
		}
		return { hora, eventos: 0, saude: agoraSaude?.estado ?? null };
	}

	// 90 dias: chega para a época andar e limpa-se sozinho
	const ttl = { expirationTtl: 60 * 60 * 24 * 90 };
	let registo = [];
	try {
		registo = JSON.parse((await env.OBSERVACAO.get(chaveDia)) ?? '[]');
	} catch {
		registo = [];
	}
	for (const e of eventos) registo.push({ t: hora, ...e });
	// um tecto, para um dia estranho não encher uma chave até ela não caber
	if (registo.length > 4000) registo = registo.slice(-4000);

	await env.OBSERVACAO.put(chaveDia, JSON.stringify(registo), ttl);
	if (estado.retrato) await env.OBSERVACAO.put(chaveEstado, JSON.stringify(estado), ttl);
	return { hora, eventos: eventos.length, saude: agoraSaude?.estado ?? null };
}

/** O relatório de um dia, com a cadência já calculada. */
async function relatorio(env, dia) {
	const registo = JSON.parse((await env.OBSERVACAO.get(`obs:${dia}`)) ?? '[]');
	const pubs = registo.filter((e) => e.tipo === 'publicacao');
	const seg = (h) => {
		const [a, b, c] = h.split(':').map(Number);
		return a * 3600 + b * 60 + c;
	};
	const gaps = pubs.slice(1).map((p, i) => seg(p.t) - seg(pubs[i].t)).sort((a, b) => a - b);
	const mediana = gaps.length ? gaps[Math.floor(gaps.length / 2)] : null;
	return {
		dia,
		eventos: registo.length,
		publicacoes: pubs.length,
		cadencia_s: { mediana, minimo: gaps[0] ?? null, maximo: gaps[gaps.length - 1] ?? null },
		buracos_acima_de_3min: gaps.filter((g) => g > 180).map((g) => `${Math.round(g / 60)}min`),
		resultados: registo.filter((e) => e.tipo === 'resultado'),
		ao_vivo: registo.filter((e) => e.tipo === 'ao_vivo'),
		erros: registo.filter((e) => e.tipo === 'erro'),
		leia_se:
			'cadência = intervalos entre dados novos no nosso CDN. Não mede o tempo desde que ' +
			'o golo foi marcado: para isso é preciso alguém no pavilhão com um cronómetro.'
	};
}

/**
 * Buscar, com cache na **Cache API** e não no KV.
 *
 * A cache dos Workers é grátis e não gasta escritas; pôr isto no KV eram ~720 escritas por
 * dia só para guardar uma resposta da GitHub, contra as 1 000 que o plano dá.
 */
async function comCache(url, segundos, opcoes = {}) {
	const chave = new Request(url, { headers: opcoes.headers });
	const cache = caches.default;
	const guardado = await cache.match(chave);
	if (guardado) return guardado.json();
	const r = await fetch(url, { headers: { 'User-Agent': UA, ...(opcoes.headers ?? {}) } });
	if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
	const corpo = await r.text();
	await cache.put(
		chave,
		new Response(corpo, { headers: { 'Cache-Control': `max-age=${segundos}` } })
	);
	return JSON.parse(corpo);
}

/** As últimas corridas das Actions. O repositório é público, logo não precisa de token. */
async function corridas(env) {
	try {
		const d = await comCache(
			`https://api.github.com/repos/${env.REPO}/actions/runs?per_page=12`,
			120
		);
		return (d.workflow_runs ?? []).map((r) => ({
			nome: r.name,
			evento: r.event,
			estado: r.conclusion ?? r.status,
			quando: r.created_at
		}));
	} catch (e) {
		return [{ nome: 'não foi possível ler as corridas', estado: String(e).slice(0, 80) }];
	}
}

/** O diário de rondas, lido do repositório público. Diz o volume que cada ronda produziu. */
async function rondas(env) {
	try {
		const r = await fetch(
			`https://raw.githubusercontent.com/${env.REPO}/main/data-samples/rondas/aplisboa.jsonl`,
			{ headers: { 'User-Agent': UA }, cf: { cacheTtl: 300 } }
		);
		if (!r.ok) return [];
		return (await r.text())
			.trim()
			.split('\n')
			.slice(-6)
			.map((l) => JSON.parse(l));
	} catch {
		return [];
	}
}

/**
 * As entradas: o que o contador do site escreveu. Só leitura.
 *
 * **Lê o mínimo, e isto não é afinação: é o que mantém a página de pé.** A primeira versão
 * pedia as 11 chaves de cada um dos 7 dias — 77 leituras — e a Cloudflare respondeu `Error
 * 1102, Worker exceeded resource limits`: o plano gratuito corta aos **50 sub-pedidos** por
 * invocação, e cada leitura do KV conta como um. A consola esteve em baixo até se perceber.
 *
 * Agora: três chaves por dia para o gráfico de sete dias — aparelhos, novos e aberturas — e o
 * detalhe por ecrã só do dia que se está a ver. Dá 30 leituras no pior caso, mais três para o
 * resto da página.
 */
async function entradas(env, dias, diaDetalhado) {
	const ECRAS = ['/', '/clube', '/competicoes', '/equipa', '/jogo', '/mais', '/privacidade',
		'/procurar', 'outro'];
	const num = async (chave) => Number(await env.CONTAGENS.get(chave)) || 0;

	// em paralelo: são 30 idas ao KV e em série a página demorava a aparecer
	const porDia = await Promise.all(
		dias.map(async (dia) => {
			const [aparelhos, novos, aberturas] = await Promise.all([
				num(`d:${dia}`),
				num(`n:${dia}`),
				num(`c:${dia}:aberturas`)
			]);
			return [dia, { aparelhos, novos, aberturas: aberturas * 10 }];
		})
	);

	const detalhe = await Promise.all(
		ECRAS.map(async (e) => [e, await num(`c:${diaDetalhado}:${e}`)])
	);

	const saida = {};
	for (const [dia, v] of porDia) {
		const linha = {};
		if (v.aparelhos) {
			linha.aparelhos = v.aparelhos;
			linha.novos = v.novos;
		}
		if (v.aberturas) linha.aberturas = v.aberturas;
		if (dia === diaDetalhado) for (const [e, n] of detalhe) if (n) linha[e] = n;
		if (Object.keys(linha).length) saida[dia] = linha;
	}
	return saida;
}

export default {
	async scheduled(_evento, env, ctx) {
		ctx.waitUntil(observar(env));
	},

	/**
	 * `GET /` → o relatório de hoje. `GET /?dia=2026-10-11` → o de outro dia.
	 * `GET /observar` → força uma leitura agora, para se poder verificar sem esperar o cron.
	 *
	 * Sem chave: o que isto devolve são resultados de jogos, que são públicos, e os nossos
	 * próprios tempos de publicação. Não há aqui nada de ninguém.
	 */
	async fetch(pedido, env) {
		const url = new URL(pedido.url);
		if (url.pathname === '/observar') {
			return Response.json(await observar(env));
		}
		const dia = url.searchParams.get('dia') ?? emLisboa().dia;
		const rel = await relatorio(env, dia);

		if (url.pathname === '/api') {
			return Response.json(rel, { headers: { 'Cache-Control': 'no-store' } });
		}

		let estado = null;
		try {
			estado = JSON.parse((await env.OBSERVACAO.get('estado')) ?? 'null');
		} catch {
			estado = null;
		}
		// sete dias: é o que mostra se o uso está a crescer ou foi só uma tarde. São 70
		// leituras do KV por carregamento, contra as 100 000 do dia.
		const base = Date.parse(`${dia}T12:00:00Z`);
		const dias = Array.from({ length: 7 }, (_, i) =>
			new Date(base - (6 - i) * 86400000).toISOString().slice(0, 10)
		);
		const [runs, diario, ent] = await Promise.all([
			corridas(env),
			rondas(env),
			entradas(env, dias, dia)
		]);
		return new Response(pagina({ dia, estado, rel, runs, diario, ent, dias }), {
			headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
		});
	}
};
