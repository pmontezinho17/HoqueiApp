/**
 * O relógio externo: acorda a ronda ao vivo quando há jogos, porque o agendador da GitHub
 * não o faz. E vigia a cadeia toda, porque o pior modo de falha não é falhar — é falhar em
 * silêncio.
 *
 * Medido a 04/10/2026, um sábado inteiro de jogos: das 8 corridas agendadas de `dados.yml`
 * saíram 2, das 3 de `aovivo.yml` saíram **zero**. E não é atraso de fila — o tempo entre a
 * criação e o arranque de cada corrida era 0 s. A GitHub não atrasa as corridas agendadas,
 * simplesmente não as cria. Os `cron` da Cloudflare criam.
 *
 * Isto não substitui a rede de `cron` que ficou na `aovivo.yml`: são duas camadas sobre a
 * mesma falha, e é de propósito.
 *
 * O Worker não lê nem escreve dados de ninguém, e nunca toca na APL. Só olha para aquilo
 * que nós próprios publicamos e, se for preciso, bate à porta da API da GitHub.
 */

/** minutos antes da hora marcada a partir dos quais vale a pena já estar acordado */
const ANTES = 45;
/** minutos depois da hora marcada em que ainda se acredita que o jogo possa estar a decorrer */
const DEPOIS = 180;

/**
 * Minutos depois do apito inicial a partir dos quais um jogo **tem** de ter resultado.
 *
 * Em hóquei em patins o jogo mais longo são duas partes de 25 minutos: com intervalos e o
 * tempo que a mesa leva a fechar a ficha, 70 a 80 minutos decorridos. Noventa dá folga sem
 * dormir em cima do problema.
 *
 * O número saiu de uma medição, não de um palpite. Com 120 minutos, corri o cão de guarda
 * contra a fotografia real de 04/10 às 18:14 — a cadeia partida, cinco jogos sem resultado
 * — e ele **não disparava**: o mais antigo tinha 104 minutos. Com 90 dispara às 18:00,
 * catorze minutos antes de o dono do projecto reparar. O custo de um falso positivo é uma
 * ronda completa a mais, que é inofensiva; o custo de um falso negativo é uma tarde de
 * resultados errados.
 */
const MADURO = 90;
/** a partir de que idade os nossos próprios dados são suspeitos (minutos) */
const DADOS_VELHOS = 40;
/** espera mínima entre dois socorros, para não martelar a fonte (minutos) */
const DESCANSO = 45;

export function agoraEmLisboa(quando = new Date()) {
	// `sv-SE` dá "2026-10-04 19:30" — ISO sem ter de montar a data campo a campo, e com o
	// fuso certo, que em Portugal muda duas vezes por ano
	const [data, hora] = new Intl.DateTimeFormat('sv-SE', {
		timeZone: 'Europe/Lisbon',
		year: 'numeric', month: '2-digit', day: '2-digit',
		hour: '2-digit', minute: '2-digit', hour12: false,
	}).format(quando).split(' ');
	return { data, hora, minutos: emMinutos(hora), instante: quando.getTime() };
}

export const emMinutos = (hm) => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5));

/**
 * Os jogos que justificam ter alguém acordado agora.
 *
 * Um jogo conta se está marcado a decorrer, ou se ainda não tem resultado e a hora dele
 * cai na janela. Um jogo já com resultado e sem marca não precisa de ninguém.
 */
export function precisamDeCobertura(jogos, agora) {
	const razoes = [];
	for (const j of jogos) {
		if (j.data !== agora.data || !j.hora) continue;
		if (j.ao_vivo) {
			razoes.push(`${j.hora.slice(0, 5)} ${j.casa}–${j.fora} a decorrer`);
			continue;
		}
		if (j.gc !== null && j.gc !== undefined) continue;
		const delta = emMinutos(j.hora) - agora.minutos;
		if (delta <= ANTES && delta >= -DEPOIS) {
			razoes.push(`${j.hora.slice(0, 5)} ${j.casa}–${j.fora} daqui a ${delta} min`);
		}
	}
	return razoes;
}

/**
 * Jogos que já deviam ter acabado e continuam sem resultado — o sinal de que a cadeia
 * partiu em silêncio.
 *
 * Não basta isto para dar o alarme: a fonte também pode simplesmente ainda não ter
 * publicado, e nesse caso correr outra ronda não traz nada. Por isso o socorro só sai
 * quando os **nossos** dados também estão velhos. Se publicámos há cinco minutos e o jogo
 * continua sem resultado, o problema não é nosso.
 */
export function emFalta(jogos, agora) {
	return jogos
		.filter((j) => j.data === agora.data && j.hora && !j.ao_vivo)
		.filter((j) => j.gc === null || j.gc === undefined)
		.filter((j) => agora.minutos - emMinutos(j.hora) >= MADURO)
		.map((j) => `${j.hora.slice(0, 5)} ${j.casa}–${j.fora} sem resultado há ${agora.minutos - emMinutos(j.hora)} min`);
}

/** idade em minutos do que está publicado, a partir do `meta.json` */
export function idadeDosDados(meta, agora) {
	const t = Date.parse(meta?.generated_at ?? '');
	return Number.isFinite(t) ? Math.round((agora.instante - t) / 60000) : Infinity;
}

async function nosso(url) {
	const r = await fetch(`${url}?t=${Date.now()}`, {
		headers: { 'user-agent': 'hoquei-relogio (github.com/pmontezinho17/HoqueiApp)' },
	});
	if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
	return r;
}

async function decidir(env, quando) {
	const agora = agoraEmLisboa(quando);
	let texto, meta;
	try {
		texto = await (await nosso(env.AGENDA)).text();
		meta = await (await nosso(env.META)).json();
	} catch (e) {
		return { agora, erro: String(e.message ?? e), razoes: [], atraso: [] };
	}

	// Varrimento barato antes do caro: na maior parte dos dias não há jogo nenhum, e aí não
	// vale a pena pagar o `JSON.parse` de 280 KB — o plano gratuito dá 10 ms de CPU por
	// invocação, e são ~100 invocações por dia.
	if (!texto.includes(`"data": "${agora.data}"`) && !texto.includes(`"data":"${agora.data}"`)) {
		return { agora, razoes: [], atraso: [], nota: 'sem jogos hoje' };
	}
	const jogos = JSON.parse(texto).jogos;
	return {
		agora,
		razoes: precisamDeCobertura(jogos, agora),
		atraso: emFalta(jogos, agora),
		idade: idadeDosDados(meta, agora),
	};
}

const cabecalhos = (env) => ({
	authorization: `Bearer ${env.GITHUB_TOKEN}`,
	accept: 'application/vnd.github+json',
	'x-github-api-version': '2022-11-28',
	'user-agent': 'hoquei-relogio',
});

async function disparar(env, workflow, ref = env.REF || 'main') {
	const url = `https://api.github.com/repos/${env.REPO}/actions/workflows/${workflow}/dispatches`;
	const r = await fetch(url, {
		method: 'POST',
		headers: { ...cabecalhos(env), 'content-type': 'application/json' },
		body: JSON.stringify({ ref }),
	});
	// 204 é o "aceite" da GitHub. Uma corrida que dispare com outra a correr fica **em
	// espera** pela `concurrency` do workflow, e arranca mal a primeira acabe — é esse
	// revezamento que dá cobertura contínua sem o ciclo se auto-disparar.
	return { ok: r.status === 204, status: r.status, corpo: r.status === 204 ? '' : await r.text() };
}

/** há quantos minutos foi criada a última corrida deste workflow (Infinity se nunca) */
async function minutosDesdeAUltima(env, workflow, agora) {
	const url = `https://api.github.com/repos/${env.REPO}/actions/workflows/${workflow}/runs?per_page=1`;
	const r = await fetch(url, { headers: cabecalhos(env) });
	if (!r.ok) return Infinity;
	const t = Date.parse((await r.json()).workflow_runs?.[0]?.created_at ?? '');
	return Number.isFinite(t) ? Math.round((agora.instante - t) / 60000) : Infinity;
}

/**
 * O cão de guarda. Não avisa: corrige.
 *
 * Um alarme por email só serve se alguém o ler, e o modo de falha que queremos fechar é
 * precisamente o de ninguém estar a olhar. Lançar a ronda completa resolve o problema em
 * vez de o anunciar — e se o problema for da fonte e não nosso, uma ronda a mais não faz
 * mal a ninguém.
 */
async function socorrer(env, d) {
	if (!d.atraso.length) return null;
	if (d.idade < DADOS_VELHOS) {
		return `${d.atraso.length} jogo(s) por fechar, mas publicámos há ${d.idade} min — o atraso é da fonte`;
	}
	const desde = await minutosDesdeAUltima(env, env.WORKFLOW_DADOS, d.agora);
	if (desde < DESCANSO) {
		return `${d.atraso.length} jogo(s) por fechar, mas a ronda completa correu há ${desde} min — a aguardar`;
	}
	const envio = await disparar(env, env.WORKFLOW_DADOS);
	return `SOCORRO: ${d.atraso.length} jogo(s) por fechar e dados com ${d.idade} min — ronda completa ${envio.ok ? 'lançada' : `falhou ${envio.status} ${envio.corpo}`}`;
}

export default {
	async scheduled(evento, env, ctx) {
		// **O relógio passa a ser também o relógio do observador.**
		//
		// Os `cron` do Worker observador deixaram de disparar a 09/10/2026 — aceites ao
		// publicar, com o `wrangler` a confirmar os dois `schedule`, e nunca executados.
		// Medido nessa noite: dez minutos de `wrangler tail` sem uma única invocação agendada,
		// e a última escrita dele às 09:58 da manhã. A consola mostrou "tudo em ordem" a noite
		// toda com o observador morto há catorze horas, que é a pior forma de falhar.
		//
		// Este `cron` dispara — é ele que lança o ciclo ao vivo, e isso vê-se nas corridas da
		// GitHub. Enquanto a causa do outro não for encontrada, é daqui que o observador
		// recebe o impulso.
		//
		// **Separado do resto e à frente dele**, de propósito: se o `decidir` falhar, o
		// observador tem de ser avisado à mesma — é precisamente quando há alguma coisa para
		// observar. E sem `await` no caminho crítico: um observador em baixo não pode atrasar
		// o lançamento de uma ronda.
		ctx.waitUntil(
			fetch(`${env.OBSERVADOR}/observar`, { headers: { 'user-agent': 'hoquei-relogio' } })
				.then((r) => console.log(`observador: HTTP ${r.status}`))
				.catch((e) => console.log(`observador: ${String(e).slice(0, 80)}`))
		);

		ctx.waitUntil((async () => {
			const d = await decidir(env, new Date(evento.scheduledTime));
			if (d.erro) return console.log(`[${d.agora.hora}] ${d.erro}`);

			if (d.razoes.length) {
				const envio = await disparar(env, env.WORKFLOW);
				console.log(`[${d.agora.hora}] ${d.razoes.length} jogo(s) — disparo ${envio.ok ? 'aceite' : `falhou ${envio.status} ${envio.corpo}`}`);
				for (const r of d.razoes) console.log(`    ${r}`);
			} else {
				console.log(`[${d.agora.hora}] nada a cobrir${d.nota ? ` (${d.nota})` : ''}`);
			}

			const guarda = await socorrer(env, d);
			if (guarda) {
				console.log(`[${d.agora.hora}] ${guarda}`);
				for (const a of d.atraso) console.log(`    ${a}`);
			}
		})());
	},

	async fetch(pedido, env) {
		// `?verificar` prova que o token tem permissão para lançar workflows **sem lançar
		// nenhum**: pede o disparo sobre um ramo que não existe. Sem permissão a GitHub
		// responde 403 antes de olhar para o ramo; com permissão chega a olhar e responde 422
		// "No ref found". Ou seja, aqui o 422 é a boa notícia.
		if (new URL(pedido.url).searchParams.has('verificar')) {
			const r = await disparar(env, env.WORKFLOW, 'refs/heads/ramo-que-nao-existe-para-testar-o-token');
			const pode = r.status === 422;
			return Response.json({
				token: pode ? 'pode lançar workflows' : 'NÃO pode lançar workflows',
				http: r.status,
				resposta: r.corpo.slice(0, 200),
				nota: pode
					? 'o 422 é o esperado: a permissão está boa e o ramo de teste não existe, de propósito'
					: 'um 403 aqui é falta da permissão Actions: Read and write — ver o README',
			}, { status: pode ? 200 : 502, headers: { 'cache-control': 'no-store' } });
		}

		const d = await decidir(env, new Date());
		return Response.json({
			agora: `${d.agora.data} ${d.agora.hora} Europe/Lisbon`,
			dispararia: d.razoes.length > 0,
			jogos: d.razoes,
			guarda: {
				jogosPorFechar: d.atraso,
				idadeDosDadosEmMinutos: d.idade ?? null,
				socorreria: d.atraso.length > 0 && (d.idade ?? 0) >= DADOS_VELHOS,
			},
			nota: d.nota ?? null,
			erro: d.erro ?? null,
		}, { headers: { 'cache-control': 'no-store' } });
	},
};
