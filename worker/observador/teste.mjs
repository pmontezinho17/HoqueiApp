/**
 * Testes das duas funções puras, que é onde vive a lógica: `node teste.mjs`.
 *
 * Sem rede e sem KV de propósito — o que pode estar errado é a comparação de retratos, e
 * essa testa-se com objectos.
 */
import assert from 'node:assert';
import { diferencas, emLisboa, retrato } from './src/index.js';

const agenda = {
	jogos: [
		{ id: 1, data: '2026-10-08', hora: '20:00:00', casa: 'A', fora: 'B', gc: null, gf: null },
		{ id: 2, data: '2026-10-08', hora: '20:30:00', casa: 'C', fora: 'D', gc: 1, gf: 0, ao_vivo: true,
		  situacao: '1ª Parte (4:12)' },
		{ id: 3, data: '2026-10-09', hora: '20:00:00', casa: 'E', fora: 'F', gc: null, gf: null }
	]
};

const hoje = retrato(agenda, '2026-10-08');
assert.deepStrictEqual(Object.keys(hoje), ['1', '2'], 'só os jogos do dia pedido');
assert.strictEqual(hoje[2].v, true);
assert.strictEqual(hoje[1].h, '20:00');

// primeira leitura: cada jogo é um evento, e o carimbo também
const primeira = diferencas(undefined, hoje, undefined, 'carimbo-1');
assert.strictEqual(primeira.filter((e) => e.tipo === 'jogo').length, 2);
assert.strictEqual(primeira.filter((e) => e.tipo === 'publicacao').length, 1);

// nada mudou: nenhum evento, e é isto que poupa as escritas no KV
assert.deepStrictEqual(diferencas(hoje, hoje, 'carimbo-1', 'carimbo-1'), []);

// um golo
const depois = JSON.parse(JSON.stringify(hoje));
depois[2].gc = 2;
const golo = diferencas(hoje, depois, 'carimbo-1', 'carimbo-2');
assert.strictEqual(golo.length, 2, 'o golo e a publicação nova');
const r = golo.find((e) => e.tipo === 'resultado');
assert.strictEqual(r.de, '1-0');
assert.strictEqual(r.para, '2-0');

// o apito final apaga a marca de ao vivo
const fim = JSON.parse(JSON.stringify(depois));
fim[2].v = false;
fim[2].s = null;
const apito = diferencas(depois, fim, 'carimbo-2', 'carimbo-2');
assert.deepStrictEqual(apito, [{ tipo: 'ao_vivo', id: 2, aceso: false, situacao: null }]);

// a situação a mudar sem a marca mudar é um evento mais fraco, e não se confunde com o apito
const meio = JSON.parse(JSON.stringify(depois));
meio[2].s = '2ª Parte (1:00)';
assert.strictEqual(diferencas(depois, meio, 'c', 'c')[0].tipo, 'situacao');

// a data em Lisboa, não em UTC: às 23:30 de Londres já é o dia seguinte em Lisboa
assert.strictEqual(emLisboa(new Date('2026-10-08T22:30:00Z')).dia, '2026-10-08');
assert.strictEqual(emLisboa(new Date('2026-10-08T23:30:00Z')).dia, '2026-10-09');

console.log('observador: 11 asserções, todas passaram');

// ─── os deltas de pedidos ─────────────────────────────────────────────────────────────
import { deltas } from './src/index.js';

// primeira leitura do dia: tudo o que o total diz é novo
assert.deepStrictEqual(deltas(undefined, { ficha: 12, calendario: 3 }, false), {
	ficha: 12,
	calendario: 3
});

// leitura seguinte, mais pedidos: só a diferença, e só do que cresceu
assert.deepStrictEqual(
	deltas({ ficha: 12, calendario: 3 }, { ficha: 20, calendario: 3 }, true),
	{ ficha: 8 }
);

// nada mudou: nada a somar
assert.deepStrictEqual(
	deltas({ ficha: 22, calendario: 3 }, { ficha: 22, calendario: 3 }, true),
	{}
);

// uma corrida nova parte de um ficheiro mais antigo e o total **desce**: conta-se o valor
// novo inteiro, e não uma diferença negativa
assert.deepStrictEqual(deltas({ ficha: 22 }, { ficha: 5 }, true), { ficha: 5 });

// dia novo: o total anterior era de ontem e não se subtrai
assert.deepStrictEqual(deltas({ ficha: 22 }, { ficha: 4 }, false), { ficha: 4 });

console.log('observador: deltas de pedidos, 5 asserções, todas passaram');

// ─── um jogo acabado não está a decorrer ───────────────────────────────────────────────
import { saude } from './src/index.js';

const ag2 = (jogos) => ({ jogos });
const jg = (hora, extra = {}) => ({ id: 1, data: '2026-10-08', hora, gc: null, gf: null, ...extra });

// 22:35, jogo das 20:00 **acabado**: nada a decorrer, logo a publicação velha não é problema
let sa = saude(ag2([jg('20:00', { gc: 3, gf: 1 })]), '2026-10-08', '22:35',
	'2026-10-08T21:26:00Z', Date.parse('2026-10-08T21:35:00Z'));
assert.strictEqual(sa.a_decorrer, 0, 'um jogo com resultado e sem marca já acabou');
assert.strictEqual(sa.publicacao_velha, false);
assert.strictEqual(sa.estado, 'verde', 'era isto que ficava vermelho todas as noites');

// o mesmo jogo, ainda marcado como ao vivo: está a decorrer, e aí 9 minutos sem publicar é mau
sa = saude(ag2([jg('20:00', { gc: 3, gf: 1, ao_vivo: true })]), '2026-10-08', '21:00',
	'2026-10-08T19:51:00Z', Date.parse('2026-10-08T20:00:00Z'));
assert.strictEqual(sa.a_decorrer, 1);
assert.strictEqual(sa.publicacao_velha, true);
assert.strictEqual(sa.estado, 'vermelho');

// um jogo sem resultado dentro da janela continua a contar como a decorrer
sa = saude(ag2([jg('20:00')]), '2026-10-08', '20:30', '2026-10-08T19:29:00Z',
	Date.parse('2026-10-08T19:30:00Z'));
assert.strictEqual(sa.a_decorrer, 1);

// e duas horas depois sem resultado é o alarme que se quer mesmo
sa = saude(ag2([jg('20:00')]), '2026-10-08', '22:10', '2026-10-08T21:09:00Z',
	Date.parse('2026-10-08T21:10:00Z'));
assert.deepStrictEqual(sa.sem_resultado, [1]);
assert.strictEqual(sa.estado, 'vermelho');

console.log('observador: saúde, 8 asserções, todas passaram');
