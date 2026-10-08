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

	let eventos;
	try {
		const [meta, agenda] = await Promise.all([ler('meta.json'), ler('agenda.json')]);
		const agora = retrato(agenda, dia);
		eventos = diferencas(estado.retrato, agora, estado.generated_at, meta.generated_at);
		estado = { retrato: agora, generated_at: meta.generated_at, dia };
	} catch (e) {
		eventos = [{ tipo: 'erro', erro: String(e).slice(0, 200) }];
	}

	if (!eventos.length) return { hora, eventos: 0 };

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
	return { hora, eventos: eventos.length };
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
		return Response.json(await relatorio(env, dia), {
			headers: { 'Cache-Control': 'no-store' }
		});
	}
};
