import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BANDEIRAS } from './bandeiras';

/**
 * **A razão de o registo dos interruptores existir é este ficheiro.**
 *
 * Uma lista escrita à mão que ninguém verifica é pior do que não haver lista: dá a sensação de
 * que alguém está a tomar conta do assunto. Estes testes são o que a impede de mentir em
 * silêncio — e o terceiro é o único que interessa de verdade, porque é o que avisa quando um
 * interruptor temporário passou da data e ninguém se lembrou dele.
 *
 * Não verificam lógica nenhuma. São testes de disciplina, como os da lista de transmissões.
 */
const RAIZ = new URL('../../../', import.meta.url);

describe('o registo dos interruptores', () => {
	it('tem interruptores, senão isto não diz nada', () => {
		expect(BANDEIRAS.length).toBeGreaterThan(0);
	});

	it('cada um aponta para um ficheiro que existe', () => {
		/**
		 * Apanha o caso de alguém mover ou renomear o ficheiro e deixar o registo a apontar
		 * para o vazio. A partir daí a lista continuaria bonita e já não descrevia nada.
		 */
		for (const b of BANDEIRAS)
			expect(existsSync(new URL(b.onde, RAIZ)), `${b.nome} → ${b.onde}`).toBe(true);
	});

	it('cada um ainda existe no código, com o nome que o registo diz', () => {
		/**
		 * O defeito que isto fecha é o mais provável de todos: o interruptor é apagado, o
		 * registo fica, e daqui a três meses alguém procura uma coisa que já não há. Ou o
		 * contrário — é renomeado, e o registo passa a falar de um nome que não existe.
		 */
		for (const b of BANDEIRAS) {
			const fonte = readFileSync(new URL(b.onde, RAIZ), 'utf-8');
			expect(fonte.includes(b.nome), `${b.nome} não aparece em ${b.onde}`).toBe(true);
		}
	});

	it('nenhum interruptor temporário passou da data', () => {
		/**
		 * **Este é o teste.** Tudo o resto nesta lista é arrumação; isto é o que faz a decisão
		 * voltar a aparecer em vez de se perder.
		 *
		 * Quando falhar, há duas respostas certas e nenhuma delas é apagar o teste: resolver o
		 * interruptor — ligá-lo de vez ou apagá-lo com o que o `aoSair` diz —, ou empurrar a
		 * data **de propósito e por escrito**, porque a fase que o justificava ainda não
		 * acabou. Empurrar a data é uma decisão legítima; esquecê-la não.
		 */
		const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Lisbon' });
		const vencidos = BANDEIRAS.filter((b) => b.ate !== null && b.ate < hoje).map(
			(b) => `${b.nome} venceu a ${b.ate} — ${b.aoSair}`
		);
		expect(vencidos).toEqual([]);
	});

	it('as datas são datas, e um permanente explica-se', () => {
		for (const b of BANDEIRAS) {
			if (b.ate !== null) expect(b.ate, b.nome).toMatch(/^\d{4}-\d{2}-\d{2}$/);
			// um `null` sem razão escrita é um interruptor eterno por omissão, que é
			// exactamente o que este registo existe para impedir
			else expect(b.porque.trim().length, b.nome).toBeGreaterThan(40);
		}
	});

	it('cada um diz o que esconde e o que há a apagar quando sair', () => {
		for (const b of BANDEIRAS) {
			expect(b.esconde.trim(), b.nome).not.toBe('');
			expect(b.aoSair.trim(), b.nome).not.toBe('');
		}
	});

	it('não há dois com o mesmo nome', () => {
		const nomes = BANDEIRAS.map((b) => b.nome);
		expect(new Set(nomes).size).toBe(nomes.length);
	});
});
