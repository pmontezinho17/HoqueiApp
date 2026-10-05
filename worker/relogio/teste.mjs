import { agoraEmLisboa, precisamDeCobertura, emMinutos } from './src/index.js';
import assert from 'node:assert/strict';

let falhas = 0;
const t = (nome, fn) => {
  try { fn(); console.log(`  ok   ${nome}`); }
  catch (e) { falhas++; console.log(`  FALHA ${nome}\n       ${e.message}`); }
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

console.log(falhas ? `\n${falhas} falha(s)` : '\ntodos passaram');
process.exit(falhas ? 1 : 0);
