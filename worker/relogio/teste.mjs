import { agoraEmLisboa, precisamDeCobertura, emMinutos, vigiarProducao, eTiqueDeDia } from './src/index.js';
import assert from 'node:assert/strict';

let falhas = 0;
// Aceita testes síncronos e `async`: os primeiros vieram antes da vigia de produção, que é
// toda ela de ida e volta. Um teste `async` que falhe tem de contar como falha, e sem o
// `await` aqui a promessa rejeitada passava ao lado do contador.
const pendentes = [];
const t = (nome, fn) => {
  try {
    const r = fn();
    if (r && typeof r.then === 'function') {
      pendentes.push(
        r.then(() => console.log(`  ok   ${nome}`))
         .catch((e) => { falhas++; console.log(`  FALHA ${nome}\n       ${e.message}`); })
      );
      return;
    }
    console.log(`  ok   ${nome}`);
  } catch (e) { falhas++; console.log(`  FALHA ${nome}\n       ${e.message}`); }
};

console.log('relógio do Worker');

t('lê a hora no fuso de Lisboa, e não no do servidor', () => {
  // 04/10/2026 às 18:30 UTC = 19:30 em Lisboa (WEST, UTC+1)
  const a = agoraEmLisboa(new Date('2026-10-04T18:30:00Z'));
  assert.equal(a.data, '2026-10-04');
  assert.equal(a.hora, '19:30');
  assert.equal(a.minutos, 19 * 60 + 30);
});

t('acompanha a mudança para hora de inverno', () => {
  // depois do último domingo de outubro Portugal volta a UTC+0
  const a = agoraEmLisboa(new Date('2026-11-15T18:30:00Z'));
  assert.equal(a.hora, '18:30');
});

t('a meia-noite UTC já é o dia seguinte em Lisboa, no verão', () => {
  const a = agoraEmLisboa(new Date('2026-10-04T23:30:00Z'));
  assert.equal(a.data, '2026-10-05');
  assert.equal(a.hora, '00:30');
});

const agora = { data: '2026-10-04', hora: '17:00', minutos: emMinutos('17:00') };

t('um jogo a decorrer justifica acordar, mesmo fora da janela', () => {
  const r = precisamDeCobertura([
    { data: '2026-10-04', hora: '10:00', casa: 'A', fora: 'B', gc: 1, gf: 0, ao_vivo: true },
  ], agora);
  assert.equal(r.length, 1);
});

t('um jogo que começa dentro de 45 min justifica acordar', () => {
  const r = precisamDeCobertura([
    { data: '2026-10-04', hora: '17:30', casa: 'A', fora: 'B', gc: null, gf: null },
  ], agora);
  assert.equal(r.length, 1);
});

t('um jogo daqui a duas horas não justifica nada', () => {
  const r = precisamDeCobertura([
    { data: '2026-10-04', hora: '19:00', casa: 'A', fora: 'B', gc: null, gf: null },
  ], agora);
  assert.equal(r.length, 0);
});

t('um jogo já com resultado e sem marca não precisa de ninguém', () => {
  const r = precisamDeCobertura([
    { data: '2026-10-04', hora: '16:30', casa: 'A', fora: 'B', gc: 9, gf: 1 },
  ], agora);
  assert.equal(r.length, 0);
});

t('um jogo sem resultado que já devia ter começado ainda é coberto', () => {
  // é precisamente o caso de 04/10: a fonte tinha 15–0 e nós ainda dizíamos "por começar"
  const r = precisamDeCobertura([
    { data: '2026-10-04', hora: '15:00', casa: 'A', fora: 'B', gc: null, gf: null },
  ], agora);
  assert.equal(r.length, 1);
});

t('um jogo de ontem, por mais estranho que esteja, não acorda ninguém', () => {
  const r = precisamDeCobertura([
    { data: '2026-10-03', hora: '17:00', casa: 'A', fora: 'B', gc: null, gf: null, ao_vivo: true },
  ], agora);
  assert.equal(r.length, 0);
});

t('um jogo abandonado há seis horas deixa de acordar o ciclo', () => {
  const r = precisamDeCobertura([
    { data: '2026-10-04', hora: '11:00', casa: 'A', fora: 'B', gc: null, gf: null },
  ], agora);
  assert.equal(r.length, 0);
});

// ---------------------------------------------------------------------------
// o cão de guarda
// ---------------------------------------------------------------------------
import { emFalta, idadeDosDados } from './src/index.js';

console.log('\ncão de guarda');

const tarde = { data: '2026-10-04', hora: '18:14', minutos: emMinutos('18:14'),
	instante: Date.parse('2026-10-04T17:14:00Z') };

t('apanha o caso real de 04/10: o jogo das 16:30 sem resultado às 18:14', () => {
	// 104 minutos depois do apito inicial. Com o limiar a 120 este caso escapava — foi o
	// que a reprodução contra a agenda real mostrou, e é por isso que o limiar são 90.
	const r = emFalta([
		{ data: '2026-10-04', hora: '16:30', casa: 'SPORTING CP A', fora: 'APAC TOJAL', gc: null, gf: null },
	], tarde);
	assert.equal(r.length, 1);
});

t('não acusa um jogo que acabou de começar', () => {
	assert.equal(emFalta([
		{ data: '2026-10-04', hora: '17:30', casa: 'A', fora: 'B', gc: null, gf: null },
	], tarde).length, 0);
});

t('não acusa um jogo a meio: 80 minutos ainda cabem num jogo de seniores', () => {
	assert.equal(emFalta([
		{ data: '2026-10-04', hora: '16:54', casa: 'A', fora: 'B', gc: null, gf: null },
	], tarde).length, 0);
});

t('não acusa um jogo marcado a decorrer, por muito que já dure', () => {
	assert.equal(emFalta([
		{ data: '2026-10-04', hora: '15:00', casa: 'A', fora: 'B', gc: 2, gf: 1, ao_vivo: true },
	], tarde).length, 0);
});

t('não acusa um jogo que já tem resultado', () => {
	assert.equal(emFalta([
		{ data: '2026-10-04', hora: '15:00', casa: 'A', fora: 'B', gc: 9, gf: 1 },
	], tarde).length, 0);
});

t('não acusa jogos de outros dias', () => {
	assert.equal(emFalta([
		{ data: '2026-10-03', hora: '10:00', casa: 'A', fora: 'B', gc: null, gf: null },
	], tarde).length, 0);
});

t('mede a idade dos dados publicados', () => {
	// meta de 16:28 WEST = 15:28 UTC, agora 18:14 WEST → 106 minutos
	assert.equal(idadeDosDados({ generated_at: '2026-10-04T15:28:00Z' }, tarde), 106);
});

t('meta em falta ou corrompida conta como infinitamente velha', () => {
	assert.equal(idadeDosDados(null, tarde), Infinity);
	assert.equal(idadeDosDados({ generated_at: 'nada disto' }, tarde), Infinity);
});


// ── A vigia de produção ───────────────────────────────────────────────────────────────────
//
// Mudou-se do agendador da GitHub para aqui a 15/10/2026, depois de a vigia de quinze em
// quinze minutos ter estado uma hora e três quartos sem correr — precisamente na manhã em que
// produção servia só ficheiros estáticos, e quem deu por isso foi o dono.

const env = {
  SONDA: 'https://hoquei.pages.dev/contar',
  WORKFLOW_SAUDE: 'saude.yml',
  REPO: 'exemplo/exemplo',
};

const comResposta = (estado) => async () => ({ status: estado });
const queRebenta = async () => { throw new Error('rede em baixo'); };

/** Um registador por teste: estes testes correm entrelaçados, e um array partilhado entre
 *  eles dava contagens de uns a aparecer nos outros — apanhado à primeira corrida. */
const registador = () => {
  const lancados = [];
  return { lancados, lancar: async (_e, w) => { lancados.push(w); return { ok: true, status: 204 }; } };
};

t('um 204 é o único "está bom", e não dispara nada', async () => {
  const { lancados, lancar } = registador();
  const v = await vigiarProducao(env, comResposta(204), lancar);
  assert.equal(v.sa, true);
  assert.deepEqual(lancados, []);
});

t('um 404 no /contar manda a verificação a sério', async () => {
  // É o sintoma exacto da avaria: as Pages Functions não correm.
  const { lancados, lancar } = registador();
  const v = await vigiarProducao(env, comResposta(404), lancar);
  assert.equal(v.sa, false);
  assert.equal(v.estado, 404);
  assert.deepEqual(lancados, ['saude.yml']);
});

t('qualquer outro estado também conta como suspeita', async () => {
  for (const estado of [200, 403, 500, 502]) {
    const { lancados, lancar } = registador();
    const v = await vigiarProducao(env, comResposta(estado), lancar);
    assert.equal(v.sa, false, `estado ${estado}`);
    assert.deepEqual(lancados, ['saude.yml'], `estado ${estado}`);
  }
});

t('uma falha de rede conta como suspeita, e não como "não sei"', async () => {
  // O custo de uma verificação a mais são seis pedidos ao nosso CDN; o de uma a menos foram
  // as 18 horas de 12/10.
  const { lancados, lancar } = registador();
  const v = await vigiarProducao(env, queRebenta, lancar);
  assert.equal(v.sa, false);
  assert.equal(v.estado, -1);
  assert.deepEqual(lancados, ['saude.yml']);
});

t('a sonda identifica-se com o prefixo que o /contar não conta', async () => {
  // Sem `hoqueiAPP` à frente, esta sonda somava uma "entrada" de dez em dez minutos — que foi
  // o defeito apanhado a 15/10. Ver o `NOSSO` no `functions/contar.js`.
  let agente = '';
  await vigiarProducao(env, async (_u, o) => { agente = o.headers['user-agent']; return { status: 204 }; }, registador().lancar);
  assert.match(agente, /^hoqueiAPP/);
});

t('e pede ao /contar, não a outra coisa qualquer', async () => {
  let url = '';
  await vigiarProducao(env, async (u) => { url = u; return { status: 204 }; }, registador().lancar);
  assert.equal(url, 'https://hoquei.pages.dev/contar?novo=0');
});

t('os tiques da noite não tratam de jogos, e por isso não pedem nada à APL', () => {
  // A pergunta do dono a 16/10/2026: "esta alteração faz com que hajam mais chamadas à APL?".
  // O `cron` da noite punha o `scheduled` inteiro a correr, incluindo o cão de guarda — que
  // lança a ronda completa e essa pede ~75 páginas. Ver o `eTiqueDeDia`.
  assert.equal(eTiqueDeDia(Date.parse('2026-10-16T03:00:00Z')), false);
  assert.equal(eTiqueDeDia(Date.parse('2026-10-16T23:00:00Z')), false);
  assert.equal(eTiqueDeDia(Date.parse('2026-10-16T05:30:00Z')), false);
});

t('e os do dia continuam a tratar, nas pontas inclusive', () => {
  assert.equal(eTiqueDeDia(Date.parse('2026-10-16T06:00:00Z')), true);
  assert.equal(eTiqueDeDia(Date.parse('2026-10-16T22:50:00Z')), true);
  assert.equal(eTiqueDeDia(Date.parse('2026-10-16T14:00:00Z')), true);
});

// O fecho tem de esperar pelos testes assíncronos: antes estava a meio do ficheiro e o
// `process.exit` corria antes de a vigia de produção sequer começar.
await Promise.all(pendentes);
console.log(falhas ? `\n${falhas} falha(s)` : '\ntodos passaram');
process.exit(falhas ? 1 : 0);
