/**
 * O relógio externo: acorda a ronda ao vivo quando há jogos, porque o agendador da GitHub
 * não o faz.
 *
 * Medido a 04/10/2026, um sábado inteiro de jogos: das 8 corridas agendadas de `dados.yml`
 * saíram 2, das 3 de `aovivo.yml` saíram **zero**. E não é atraso de fila — o tempo entre a
 * criação e o arranque de cada corrida era 0 s. A GitHub não atrasa as corridas agendadas,
 * simplesmente não as cria. Os `cron` da Cloudflare criam.
 *
 * Isto não substitui a rede de `cron` que ficou na `aovivo.yml`: são duas camadas sobre a
 * mesma falha, e é de propósito. Se este Worker morrer, a rede continua a cobrir o caso
 * normal; se a rede falhar como falhou, este acorda na mesma.
 *
 * O Worker não lê nem escreve dados de ninguém. Só olha para a agenda que nós próprios
 * publicamos e, se houver jogo, bate à porta da API da GitHub.
 */

/** minutos antes da hora marcada a partir dos quais vale a pena já estar acordado */
const ANTES = 45;
/** minutos depois da hora marcada em que ainda se acredita que o jogo possa estar a decorrer */
const DEPOIS = 180;

export function agoraEmLisboa(quando = new Date()) {
  // `sv-SE` dá "2026-10-04 19:30" — ISO sem ter de montar a data campo a campo, e com o
  // fuso certo, que em Portugal muda duas vezes por ano
  const [data, hora] = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Lisbon',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(quando).split(' ');
  return { data, hora, minutos: emMinutos(hora) };
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

async function decidir(env, quando) {
  const agora = agoraEmLisboa(quando);
  const r = await fetch(`${env.AGENDA}?t=${Date.now()}`, {
    headers: { 'user-agent': 'hoquei-relogio (github.com/pmontezinho17/HoqueiApp)' },
  });
  if (!r.ok) return { agora, erro: `agenda: HTTP ${r.status}`, razoes: [] };

  // Varrimento barato antes do caro: na maior parte dos dias não há jogo nenhum, e aí não
  // vale a pena pagar o `JSON.parse` de 280 KB — o plano gratuito dá 10 ms de CPU por
  // invocação, e são 100 invocações por dia.
  const texto = await r.text();
  if (!texto.includes(`"data": "${agora.data}"`) && !texto.includes(`"data":"${agora.data}"`)) {
    return { agora, razoes: [], nota: 'sem jogos hoje' };
  }
  return { agora, razoes: precisamDeCobertura(JSON.parse(texto).jogos, agora) };
}

async function disparar(env) {
  const url = `https://api.github.com/repos/${env.REPO}/actions/workflows/${env.WORKFLOW}/dispatches`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.GITHUB_TOKEN}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      'user-agent': 'hoquei-relogio',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ ref: env.REF || 'main' }),
  });
  // 204 é o "aceite" da GitHub. Uma corrida que dispare com outra a correr fica **em
  // espera** pela `concurrency` do workflow, e arranca mal a primeira acabe — é esse
  // revezamento que dá cobertura contínua sem o ciclo se auto-disparar.
  return { ok: r.status === 204, status: r.status, corpo: r.status === 204 ? '' : await r.text() };
}

export default {
  async scheduled(evento, env, ctx) {
    ctx.waitUntil((async () => {
      const d = await decidir(env, new Date(evento.scheduledTime));
      if (d.erro) return console.log(`[${d.agora.hora}] ${d.erro}`);
      if (!d.razoes.length) return console.log(`[${d.agora.hora}] nada a cobrir${d.nota ? ` (${d.nota})` : ''}`);
      const envio = await disparar(env);
      console.log(`[${d.agora.hora}] ${d.razoes.length} jogo(s) — disparo ${envio.ok ? 'aceite' : `falhou ${envio.status} ${envio.corpo}`}`);
      for (const r of d.razoes) console.log(`    ${r}`);
    })());
  },

  /** Só para espreitar: diz o que faria agora, e não dispara nada. */
  async fetch(pedido, env) {
    const d = await decidir(env, new Date());
    return Response.json({
      agora: `${d.agora.data} ${d.agora.hora} Europe/Lisbon`,
      dispararia: d.razoes.length > 0,
      jogos: d.razoes,
      nota: d.nota ?? null,
      erro: d.erro ?? null,
    }, { headers: { 'cache-control': 'no-store' } });
  },
};
