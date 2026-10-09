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
export function diferencas(antes, depois, carimboAntes, carimboDepois, aDecorrer = null) {
	const ev = [];
	if (carimboDepois && carimboDepois !== carimboAntes) {
		// `v` = jogos a decorrer no momento desta publicação. Serve para distinguir um
		// intervalo entre publicações que é silêncio normal — o ciclo só publica quando algo
		// muda, e dez minutos sem golos são dez minutos sem publicar — de um intervalo que é
		// o ciclo parado com jogos em campo. Sem isto, o relatório contava 5 "buracos" numa
		// noite em que correu tudo bem.
		ev.push({ tipo: 'publicacao', generated_at: carimboDepois, v: aDecorrer });
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
		// **Um jogo acabado não está a decorrer.**
		//
		// A primeira versão contava como "na janela" qualquer jogo nas três horas seguintes
		// ao apito inicial, tivesse acabado ou não. Resultado medido a 08/10/2026 às 22:35,
		// dez minutos depois do último jogo terminar: a saúde ficou **vermelha** com
		// "publicação parada com jogos a decorrer" — porque os jogos das 20:00 ainda caíam
		// na janela de três horas e o ciclo, com razão, já não publicava nada.
		//
		// Isto teria aberto uma issue e mandado um email ao dono em **todas** as noites de
		// jogos, no momento em que tudo tinha corrido bem. Um aviso que grita por nada é um
		// aviso que se aprende a ignorar, e aí deixa de servir para o caso a sério.
		const acabado = (j.gc ?? null) !== null && !j.ao_vivo;
		if (decorridos >= -15 && decorridos <= 180 && !acabado) aDecorrer++;
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
 * Avisar quando a cadeia muda de cor — e avisar **de maneira que chegue**.
 *
 * ## A perna que faltava
 *
 * Isto abria a issue aqui, com `POST /issues`, e recebia 201. O que nunca fez foi chegar a
 * alguém: o token é pessoal, logo a issue nascia com o dono por autor, e **a GitHub não
 * notifica ninguém das suas próprias acções**. Confirmado a 09/10/2026 a perguntar quem era
 * o autor da issue de teste: `pmontezinho17`, ele mesmo. Não se apanha a ler o código — o
 * `POST` devolve 201, que é sucesso.
 *
 * Agora quem escreve a issue é o `aviso.yml`, com o `GITHUB_TOKEN` embutido das Actions, cujo
 * actor é o `github-actions[bot]`. Outro actor, logo há notificação.
 *
 * O que este Worker faz é **compor o texto e despachar o workflow**. O texto fica aqui porque
 * é aqui que está o diagnóstico; a entrega fica lá porque é lá que há um actor que notifica.
 *
 * Precisa de `Actions: Read and write` no token. Só `Actions: Read-only` dá 403 ao despachar,
 * e o `/verificar-aviso` di-lo por palavras.
 */
async function avisar(env, antes, agora, dia) {
	if (!env.GITHUB_TOKEN) return 'sem token: aviso não enviado';
	const passouAVermelho = antes !== 'vermelho' && agora.estado === 'vermelho';
	const voltouAVerde = antes === 'vermelho' && agora.estado === 'verde';
	if (!passouAVermelho && !voltouAVerde) return null;

	const corpo = passouAVermelho
		? [
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
				'_Composto pelo `worker/observador` e aberto pelo `aviso.yml`. Fecha-se sozinha_',
				'_quando voltar a verde._'
			]
				.filter((l) => l !== null)
				.join('\n')
		: '';

	const r = await despachar(env, {
		estado: passouAVermelho ? 'vermelho' : 'verde',
		dia,
		corpo
	});
	// 204 é o "aceite" da GitHub: a corrida entra em fila e abre a issue daí a ~20 s
	if (r.ok) return `aviso despachado (${passouAVermelho ? 'vermelho' : 'verde'})`;
	return `o despacho do aviso falhou: HTTP ${r.status}`;
}

/** Despachar o `aviso.yml`. Devolve o estado, porque um aviso que não sai tem de ficar escrito. */
async function despachar(env, inputs) {
	const url = `https://api.github.com/repos/${env.REPO}/actions/workflows/aviso.yml/dispatches`;
	try {
		const r = await fetch(url, {
			method: 'POST',
			headers: {
				'User-Agent': UA,
				Authorization: `Bearer ${env.GITHUB_TOKEN}`,
				Accept: 'application/vnd.github+json',
				'X-GitHub-Api-Version': '2022-11-28',
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ ref: env.REF ?? 'main', inputs })
		});
		return {
			ok: r.status === 204,
			status: r.status,
			corpo: r.status === 204 ? '' : (await r.text()).slice(0, 200)
		};
	} catch (e) {
		return { ok: false, status: 0, corpo: String(e).slice(0, 120) };
	}
}

/**
 * Os pedidos à fonte, distribuídos pelas horas do dia.
 *
 * O `meta.json` traz um total do dia que **só cresce**, acumulado no próprio ficheiro pelo
 * raspador — ver `acumular_pedidos`. Aqui faz-se a diferença entre duas leituras, e quem a
 * soma à hora certa é o `INSERT ... ON CONFLICT` do D1, que não tem corrida.
 *
 * **Uma descida significa recomeço, não pedidos negativos.** Uma corrida nova parte do
 * ficheiro commitado, que pode ser de há horas e ter um total menor; aí conta-se o valor novo
 * como sendo tudo o que há, em vez de uma diferença negativa.
 *
 * Devolve `{tipo: delta}` — só o que cresceu. Antes isto acumulava um objecto de baldes no
 * estado, e era essa acumulação em memória que obrigava a reescrever o estado inteiro a cada
 * minuto. Em SQL é uma linha por hora e por tipo.
 */
export function deltas(totalAntes, totalAgora, mesmoDia) {
	const antes = (mesmoDia && totalAntes) || {};
	const agora = totalAgora || {};
	const saida = {};
	for (const [tipo, n] of Object.entries(agora)) {
		const delta = n >= (antes[tipo] ?? 0) ? n - (antes[tipo] ?? 0) : n;
		if (delta > 0) saida[tipo] = delta;
	}
	return saida;
}

/**
 * Uma leitura: lê o que publicamos, compara com o retrato anterior, e grava o que mudou.
 *
 * **Escreve em D1 e não no KV**, desde 09/10/2026. A razão está no `dados/esquema.sql`, com
 * os números: o KV dá 1 000 escritas por dia e uma noite de quatro jogos gastava ~800.
 *
 * Tudo numa `batch`: as linhas de observação, a hora dos pedidos à fonte e o estado vão numa
 * só ida à base de dados, e ou entram todas ou não entra nenhuma.
 */
async function observar(env) {
	const { dia, hora } = emLisboa();
	const bd = env.DADOS;
	if (!bd) return { hora, erro: 'sem ligação à base de dados' };

	let estado = {};
	try {
		const linha = await bd.prepare('SELECT json FROM estado WHERE id = 1').first();
		if (linha?.json) estado = JSON.parse(linha.json);
	} catch {
		estado = {};
	}
	const anterior = estado;

	let eventos;
	let agoraSaude = null;
	let pedidos = {};
	try {
		const [meta, agenda] = await Promise.all([ler('meta.json'), ler('agenda.json')]);
		const agora = retrato(agenda, dia);
		agoraSaude = saude(agenda, dia, hora, meta.generated_at);
		eventos = diferencas(
			estado.retrato, agora, estado.generated_at, meta.generated_at, agoraSaude.a_decorrer
		);
		if (estado.saude?.estado !== agoraSaude.estado) {
			eventos.push({ tipo: 'saude', ...agoraSaude });
			const r = await avisar(env, estado.saude?.estado, agoraSaude, dia);
			if (r) eventos.push({ tipo: 'aviso', resultado: r });
		}
		// só se contam pedidos quando a ronda é nova: duas leituras da mesma ronda contariam
		// os mesmos pedidos duas vezes
		if (meta.generated_at !== estado.generated_at) {
			pedidos = deltas(
				estado.pedidos_dia?.por_tipo,
				meta.pedidos_dia?.por_tipo,
				(estado.pedidos_dia?.dia ?? estado.dia) === dia
			);
		}
		estado = {
			retrato: agora,
			generated_at: meta.generated_at,
			dia,
			saude: agoraSaude,
			pedidos_fonte: meta.pedidos_fonte ?? null,
			pedidos_falhados: meta.pedidos_falhados ?? null,
			pedidos_dia: meta.pedidos_dia ?? null
		};
	} catch (e) {
		eventos = [{ tipo: 'erro', detalhe: String(e).slice(0, 200) }];
	}

	const mudouEstado =
		JSON.stringify(estado.saude) !== JSON.stringify(anterior?.saude) ||
		estado.generated_at !== anterior?.generated_at;
	if (!eventos.length && !mudouEstado) return { hora, eventos: 0, saude: agoraSaude?.estado ?? null };

	const escritas = [];
	for (const e of eventos) {
		escritas.push(
			bd
				.prepare(
					`INSERT INTO observacao (dia, hora, tipo, jogo, de, para, situacao, a_decorrer, detalhe)
					 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
				)
				.bind(
					dia,
					hora,
					e.tipo,
					e.id ?? null,
					e.de ?? null,
					e.para ?? null,
					e.situacao ?? null,
					e.v ?? e.a_decorrer ?? null,
					// o que não tem coluna própria vai em JSON, para um evento novo não obrigar
					// a uma migração
					JSON.stringify(
						Object.fromEntries(
							Object.entries(e).filter(
								([k]) => !['tipo', 'id', 'de', 'para', 'situacao', 'v'].includes(k)
							)
						)
					)
				)
		);
	}
	// **A hora da ronda, e não a hora em que reparámos nela.** Os pedidos foram feitos quando
	// o raspador correu; bucketizá-los pela hora da observação punha tudo o que aconteceu antes
	// da primeira leitura do dia no balde dessa leitura — numa sexta-feira isso era a ronda das
	// 00:30 a aparecer às 17h. O `generated_at` diz quando a ronda publicou, e é esse o balde.
	//
	// Só quando a ronda é do próprio dia: uma ronda das 23:50 observada às 00:01 cairia no
	// balde das 23h de um dia que acabou de começar.
	const daRonda = estado.generated_at ? emLisboa(new Date(estado.generated_at)) : null;
	const horaDaRonda =
		daRonda?.dia === dia ? Number(daRonda.hora.slice(0, 2)) : Number(hora.slice(0, 2));
	for (const [tipo, n] of Object.entries(pedidos)) {
		escritas.push(
			bd
				.prepare(
					`INSERT INTO pedido_fonte (dia, hora, tipo, n) VALUES (?, ?, ?, ?)
					 ON CONFLICT (dia, hora, tipo) DO UPDATE SET n = n + excluded.n`
				)
				.bind(dia, horaDaRonda, tipo, n)
		);
	}
	// **A limpeza, uma vez por dia e não a cada minuto.** O D1 não tem expiração como o KV
	// tinha, por isso as linhas ficam para sempre se ninguém as apagar — e o KV limpava-se
	// sozinho com um TTL de 120 dias. Isto corre só na primeira observação de um dia novo,
	// que é quando `anterior.dia` ainda diz ontem: um `DELETE` por dia contra 1 400 se fosse
	// a cada invocação.
	//
	// 90 dias chega para olhar para trás numa época e não ameaça nada: um dia de jogos dá
	// ~2 000 linhas de observação, logo 90 dias são ~180 000 linhas e uns 20 MB, contra os
	// 5 GB do plano. Os contadores (`visita`, `aparelho`, `pedido_fonte`) **não** se apagam:
	// são uma linha por dia e são precisamente o histórico que o dono quer ver crescer.
	if (anterior?.dia && anterior.dia !== dia) {
		escritas.push(
			bd.prepare("DELETE FROM observacao WHERE dia < date(?, '-90 days')").bind(dia)
		);
	}

	if (estado.retrato) {
		escritas.push(
			bd
				.prepare(
					`INSERT INTO estado (id, actualizado, json) VALUES (1, ?, ?)
					 ON CONFLICT (id) DO UPDATE SET actualizado = excluded.actualizado, json = excluded.json`
				)
				.bind(`${dia} ${hora}`, JSON.stringify(estado))
		);
	}

	try {
		await bd.batch(escritas);
	} catch (e) {
		// Uma medição perdida não é motivo para nada, e nunca pode derrubar a invocação do
		// cron: o `waitUntil` propagaria a excepção.
		return { hora, eventos: eventos.length, erro_a_gravar: String(e).slice(0, 120) };
	}
	return { hora, eventos: eventos.length, saude: agoraSaude?.estado ?? null };
}


/**
 * Provar que o aviso funciona, sem esperar que algo corra mal.
 *
 * **Porque é que isto existe:** a cadeia de aviso — saúde a vermelho → issue → email — esteve
 * construída e testada desde 06/10/2026 e **nunca chegou a ninguém**. Primeiro porque faltava
 * o segredo; depois, com o segredo lá, porque a issue nascia com o dono por autor e a GitHub
 * não notifica ninguém das suas próprias acções. Dois modos de falha seguidos, ambos
 * silenciosos, ambos a devolverem sucesso.
 *
 * Um aviso que não se consegue experimentar é um aviso em que não se pode confiar, e o dia em
 * que se descobre que não funciona é sempre o pior dia.
 *
 * Despacha o `aviso.yml` com `estado: teste`: ele abre uma issue com etiqueta `teste` — não
 * `cadeia`, para não se cruzar com a procura do aviso a sério — e fecha-a logo. **Percorre o
 * mesmo caminho que o aviso verdadeiro**, que é o que faz disto uma prova e não uma encenação.
 *
 * Correr outra vez sempre que o token for rodado.
 */
async function verificarAviso(env) {
	if (!env.GITHUB_TOKEN) return { ok: false, porque: 'sem GITHUB_TOKEN no Worker' };
	const { dia } = emLisboa();
	const r = await despachar(env, { estado: 'teste', dia, corpo: '' });
	if (r.ok) {
		return {
			ok: true,
			despacho: 'HTTP 204',
			corridas: `https://github.com/${env.REPO}/actions/workflows/aviso.yml`,
			leia_se:
				'despachado. A corrida abre a issue daí a ~20 s e o email sai na abertura — o ' +
				'autor é o github-actions[bot], que é o que faz a notificação existir. Ver a ' +
				'corrida no endereço acima.'
		};
	}
	return {
		ok: false,
		despacho: `HTTP ${r.status}`,
		porque:
			// 403 com as corridas a lerem-se bem significa uma coisa só, e é fácil de corrigir
			// sem tocar no segredo: editar as permissões do token não muda o seu valor
			r.status === 403
				? 'o token tem `Actions: Read-only` e para despachar precisa de `Actions: Read and write`'
				: r.corpo
	};
}

/**
 * O relatório de um dia: lê as observações desse dia e calcula a cadência.
 *
 * Em SQL, com `WHERE dia = ?`, em vez de desembrulhar um array JSON inteiro de uma chave do
 * KV. As linhas vêm com os nomes das colunas; converte-se para a forma que a página já
 * desenhava, que é mais curta (`t`, `id`, `v`) e não vale a pena mexer.
 */
async function relatorio(env, dia) {
	if (!env.DADOS) return vazio(dia, 'sem ligação à base de dados');
	let registo;
	try {
		const { results } = await env.DADOS.prepare(
			`SELECT hora AS t, tipo, jogo AS id, de, para, situacao, a_decorrer AS v, detalhe
			 FROM observacao WHERE dia = ? ORDER BY id`
		)
			.bind(dia)
			.all();
		registo = results ?? [];
	} catch (e) {
		return vazio(dia, String(e).slice(0, 160));
	}

	const pubs = registo.filter((e) => e.tipo === 'publicacao');
	const seg = (h) => {
		const [a, b, c] = h.split(':').map(Number);
		return a * 3600 + b * 60 + c;
	};
	const gaps = pubs.slice(1).map((p, i) => seg(p.t) - seg(pubs[i].t)).sort((a, b) => a - b);
	const mediana = gaps.length ? gaps[Math.floor(gaps.length / 2)] : null;
	// Só é buraco se havia jogos a decorrer do outro lado dele. `v` só existe desde
	// 08/10/2026 à noite; uma publicação sem `v` não se acusa, por não se saber.
	const buracos = pubs
		.slice(1)
		.map((p, i) => ({ s: seg(p.t) - seg(pubs[i].t), v: p.v }))
		.filter((g) => g.s > 180 && (g.v ?? 0) > 0)
		.map((g) => `${Math.round(g.s / 60)}min`);
	return {
		dia,
		eventos: registo.length,
		publicacoes: pubs.length,
		cadencia_s: { mediana, minimo: gaps[0] ?? null, maximo: gaps[gaps.length - 1] ?? null },
		buracos_acima_de_3min: buracos,
		intervalos_longos_sem_jogos: gaps.filter((g) => g > 180).length - buracos.length,
		resultados: registo.filter((e) => e.tipo === 'resultado'),
		ao_vivo: registo.filter((e) => e.tipo === 'ao_vivo'),
		erros: registo.filter((e) => e.tipo === 'erro'),
		leia_se:
			'cadência = intervalos entre dados novos no nosso CDN. Não mede o tempo desde que ' +
			'o golo foi marcado: para isso é preciso alguém no pavilhão com um cronómetro.'
	};
}

/** Um relatório com a forma certa e nada dentro: a consola desenha-se à mesma, com o erro. */
function vazio(dia, porque) {
	return {
		dia,
		eventos: 0,
		publicacoes: 0,
		cadencia_s: { mediana: null, minimo: null, maximo: null },
		buracos_acima_de_3min: [],
		intervalos_longos_sem_jogos: 0,
		resultados: [],
		ao_vivo: [],
		erros: [{ t: '', tipo: 'erro', detalhe: porque }],
		leia_se: porque
	};
}

/**
 * Os pedidos à fonte de um dia, em baldes por hora: `{0: {ficha: 3}, 20: {…}}`.
 *
 * Uma consulta, 24 linhas no pior caso realista. Antes isto vinha de um objecto acumulado
 * dentro do estado, que era preciso reescrever inteiro a cada minuto para lhe somar um.
 */
async function horasDoDia(env, dia) {
	if (!env.DADOS) return {};
	try {
		const { results } = await env.DADOS.prepare(
			'SELECT hora, tipo, n FROM pedido_fonte WHERE dia = ?'
		)
			.bind(dia)
			.all();
		const horas = {};
		for (const r of results ?? []) (horas[r.hora] ??= {})[r.tipo] = r.n;
		return horas;
	} catch {
		return {};
	}
}

/**
 * Buscar, com cache na **Cache API** e não no KV.
 *
 * A cache dos Workers é grátis e não gasta escritas; pôr isto no KV eram ~720 escritas por
 * dia só para guardar uma resposta da GitHub, contra as 1 000 que o plano dá.
 */
async function comCache(url, segundos, opcoes = {}) {
	// A chave é só o URL, sem os cabeçalhos: com o `Authorization` dentro dela, cada pedido
	// com token era uma entrada diferente e a cache nunca acertava.
	const chave = new Request(url);
	const cache = caches.default;
	const guardado = await cache.match(chave);
	if (guardado) return guardado.json();
	const r = await fetch(url, { headers: { 'User-Agent': UA, ...(opcoes.headers ?? {}) } });
	// o estado primeiro: a mensagem é cortada aos 80 caracteres ao chegar à consola, e
	// com o URL à frente era o estado que desaparecia — exactamente o que se precisa de ler
	if (!r.ok) throw new Error(`HTTP ${r.status} — ${url}`);
	const corpo = await r.text();
	await cache.put(
		chave,
		new Response(corpo, { headers: { 'Cache-Control': `max-age=${segundos}` } })
	);
	return JSON.parse(corpo);
}

/**
 * As últimas corridas das Actions.
 *
 * **Precisa de token, e isto foi medido a 09/10/2026.** O repositório é público, por isso
 * parecia não precisar — e da minha máquina não precisa mesmo. A partir do Worker a GitHub
 * responde **HTTP 403**: o limite sem autenticação é de 60 pedidos por hora e por IP, e os
 * IPs de saída da Cloudflare são partilhados por muita gente, logo o balde já vem gasto. Com
 * token são 5 000 por hora e a conta é nossa.
 *
 * Sem token isto não parte nada — diz que não conseguiu ler, e o resto da consola desenha-se.
 */
async function corridas(env) {
	try {
		const d = await comCache(
			`https://api.github.com/repos/${env.REPO}/actions/runs?per_page=12`,
			120,
			env.GITHUB_TOKEN
				? { headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}` } }
				: {}
		);
		return (d.workflow_runs ?? []).map((r) => ({
			nome: r.name,
			evento: r.event,
			estado: r.conclusion ?? r.status,
			quando: r.created_at
		}));
	} catch (e) {
		return [
			{
				nome: env.GITHUB_TOKEN
					? 'não foi possível ler as corridas'
					: 'sem GITHUB_TOKEN: a GitHub responde 403 a partir do Worker',
				estado: String(e).slice(0, 80)
			}
		];
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
 * **Duas consultas, e isto não é afinação: é o que mantém a página de pé.** No KV a primeira
 * versão pedia as 11 chaves de cada um dos 7 dias — 77 leituras — e a Cloudflare respondeu
 * `Error 1102, Worker exceeded resource limits`: o plano gratuito corta aos **50 sub-pedidos**
 * por invocação, e cada leitura do KV contava um. Depois baixou-se para 30, que cabia mas era
 * frágil. Em SQL são duas idas, independentemente de quantos dias se peçam.
 */
async function entradas(env, dias, diaDetalhado) {
	if (!env.DADOS) return {};
	const saida = {};
	try {
		const marcas = dias.map(() => '?').join(',');
		const [visitas, aparelhos] = await env.DADOS.batch([
			env.DADOS.prepare(
				`SELECT dia, ecra, n FROM visita WHERE dia IN (${marcas})`
			).bind(...dias),
			env.DADOS.prepare(
				`SELECT dia, total, novos FROM aparelho WHERE dia IN (${marcas})`
			).bind(...dias)
		]);

		for (const r of aparelhos.results ?? []) {
			if (!r.total) continue;
			(saida[r.dia] ??= {}).aparelhos = r.total;
			saida[r.dia].novos = r.novos;
		}
		for (const r of visitas.results ?? []) {
			if (!r.n) continue;
			// `aberturas` é amostrado 1 em 10: guarda-se a amostra, mostra-se a estimativa.
			if (r.ecra === 'aberturas') (saida[r.dia] ??= {}).aberturas = r.n * 10;
			// o detalhe por ecrã só do dia que se está a ver: sete dias de ecrãs numa só
			// tabela seria ruído, e é o dia aberto que se está a ler
			else if (r.dia === diaDetalhado) (saida[r.dia] ??= {})[r.ecra] = r.n;
		}
	} catch {
		return saida;
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
		// o teste do aviso, à mão: ver `verificarAviso`
		if (url.pathname === '/verificar-aviso') {
			return Response.json(await verificarAviso(env), {
				headers: { 'Cache-Control': 'no-store' }
			});
		}
		const dia = url.searchParams.get('dia') ?? emLisboa().dia;
		const rel = await relatorio(env, dia);

		if (url.pathname === '/api') {
			return Response.json(rel, { headers: { 'Cache-Control': 'no-store' } });
		}

		let estado = null;
		try {
			const linha = await env.DADOS?.prepare('SELECT json FROM estado WHERE id = 1').first();
			estado = linha?.json ? JSON.parse(linha.json) : null;
		} catch {
			estado = null;
		}
		// sete dias: é o que mostra se o uso está a crescer ou foi só uma tarde.
		const base = Date.parse(`${dia}T12:00:00Z`);
		const dias = Array.from({ length: 7 }, (_, i) =>
			new Date(base - (6 - i) * 86400000).toISOString().slice(0, 10)
		);
		const [runs, diario, ent, horas] = await Promise.all([
			corridas(env),
			rondas(env),
			entradas(env, dias, dia),
			horasDoDia(env, dia)
		]);
		return new Response(pagina({ dia, estado, rel, runs, diario, ent, dias, horas }), {
			headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
		});
	}
};
