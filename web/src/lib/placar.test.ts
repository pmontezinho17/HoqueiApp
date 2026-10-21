import { describe, expect, it } from 'vitest';
import { estadoDoPlacar } from './placar';

/**
 * **O placar tem de dizer qual é a parte do jogo.**
 *
 * Pedido do dono a 21/10/2026. Antes mostrava o relógio e escondia o período atrás dele: quem
 * olhava via `12:34` e não sabia se era a primeira ou a segunda parte. Ver o `placar.ts`.
 */
describe('o estado por baixo do resultado', () => {
	const base = { aDecorrer: false, porComecar: false };

	it('por começar, antes do apito', () => {
		expect(estadoDoPlacar({ ...base, porComecar: true })).toBe('Por começar');
	});

	it('final, depois do apito final', () => {
		expect(estadoDoPlacar(base)).toBe('Final');
	});

	it('a decorrer: a parte e o minuto, nessa ordem', () => {
		// O `parsers/jogo.py` parte a situação da fonte em dois — "2ª Parte (12:34)" vira
		// periodo="2ª Parte" e relogio="12:34". É esta a forma real dos dados.
		expect(estadoDoPlacar({ aDecorrer: true, porComecar: false, periodo: '2ª Parte', relogio: '12:34' }))
			.toBe('2ª Parte · 12:34');
	});

	it('a parte sozinha quando a fonte não dá relógio', () => {
		// "Intervalo" e "Prolongamento" chegam sem relógio — ver o mesmo parser.
		expect(estadoDoPlacar({ aDecorrer: true, porComecar: false, periodo: 'Intervalo' }))
			.toBe('Intervalo');
	});

	it('o relógio sozinho quando a fonte não dá parte', () => {
		expect(estadoDoPlacar({ aDecorrer: true, porComecar: false, relogio: '03:21' })).toBe('03:21');
	});

	it('a situação serve de recuo quando não há período', () => {
		expect(estadoDoPlacar({ aDecorrer: true, porComecar: false, situacao: 'Prolongamento' }))
			.toBe('Prolongamento');
	});

	it('nunca devolve vazio: a ausência de estado lê-se como avaria', () => {
		expect(estadoDoPlacar({ aDecorrer: true, porComecar: false })).toBe('Ao vivo');
		expect(estadoDoPlacar({ aDecorrer: true, porComecar: false, periodo: '  ', relogio: ' ' }))
			.toBe('Ao vivo');
	});

	it('e o defeito reproduz-se: o relógio sozinho não diz a parte', () => {
		// Era isto que o placar mostrava até 21/10/2026, porque lia o relógio primeiro.
		const comOsDois = { aDecorrer: true, porComecar: false, periodo: '1ª Parte', relogio: '08:12' };
		expect(estadoDoPlacar(comOsDois)).toContain('1ª Parte');
		expect(estadoDoPlacar(comOsDois)).not.toBe('08:12');
	});
});
