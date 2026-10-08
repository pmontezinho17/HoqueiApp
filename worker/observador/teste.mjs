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

// ─── os baldes por hora ────────────────────────────────────────────────────────────────
import { porHora } from './src/index.js';

// primeira leitura do dia: tudo o que o total diz cai na hora em que se viu
let h = porHora(undefined, undefined, { ficha: 12, calendario: 3 }, '14:05', '2026-10-08', undefined);
assert.deepStrictEqual(h, { 14: { ficha: 12, calendario: 3 } });

// leitura seguinte, mais pedidos: só a diferença, e na hora nova
h = porHora(h, { ficha: 12, calendario: 3 }, { ficha: 20, calendario: 3 }, '15:40', '2026-10-08', '2026-10-08');
assert.deepStrictEqual(h, { 14: { ficha: 12, calendario: 3 }, 15: { ficha: 8 } });

// a mesma hora outra vez: soma ao balde que já existe
h = porHora(h, { ficha: 20, calendario: 3 }, { ficha: 22, calendario: 3 }, '15:55', '2026-10-08', '2026-10-08');
assert.deepStrictEqual(h[15], { ficha: 10 });

// nada mudou: nenhum balde mexe
assert.deepStrictEqual(
	porHora(h, { ficha: 22, calendario: 3 }, { ficha: 22, calendario: 3 }, '16:00', '2026-10-08', '2026-10-08'),
	h
);

// uma corrida nova parte de um ficheiro mais antigo e o total **desce**: conta-se o novo
// valor inteiro, e não uma diferença negativa
h = porHora(h, { ficha: 22 }, { ficha: 5 }, '17:00', '2026-10-08', '2026-10-08');
assert.deepStrictEqual(h[17], { ficha: 5 });

// dia novo: os baldes recomeçam
assert.deepStrictEqual(
	porHora(h, { ficha: 22 }, { ficha: 4 }, '00:10', '2026-10-09', '2026-10-08'),
	{ 0: { ficha: 4 } }
);

console.log('observador: baldes por hora, 6 asserções, todas passaram');
