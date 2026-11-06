import { describe, expect, it } from 'vitest';
import { comNomesDaAgenda, fichaDaAgenda } from './fichaDaAgenda';
import type { JogoAgenda } from './tipos';

const jogo = (extra: Partial<JogoAgenda> = {}): JogoAgenda => ({
	id: 9864,
	data: '2026-10-10',
	hora: '10:00',
	casa: 'FSE/AJ SALESIANA',
	fora: 'CACO',
	gc: null,
	gf: null,
	recinto: 'PAV. SALESIANA',
	comp: 459,
	prova: 'CAMP. REG. SUB-19 - 1ª FASE',
	cat: 'SUB-19',
	...extra
});

describe('a ficha montada da agenda', () => {
	it('traz o contexto todo que a página precisa de desenhar', () => {
		const f = fichaDaAgenda(jogo());
		expect(f.casa).toBe('FSE/AJ SALESIANA');
		expect(f.hora).toBe('10:00');
		expect(f.recinto).toBe('PAV. SALESIANA');
		expect(f.categoria).toBe('SUB-19');
		// o id da competição é o que faz o separador da classificação aparecer
		expect(f.competicao_id).toBe(459);
	});

	it('um jogo por disputar fica "por começar", e não a decorrer', () => {
		const f = fichaDaAgenda(jogo());
		expect(f.situacao).toBe('Por começar');
		expect(f.golos_casa).toBeNull();
	});

	/** Inventar "1ª Parte" aqui punha a app a afirmar o que não observou. */
	it('não inventa período nem relógio', () => {
		const f = fichaDaAgenda(jogo());
		expect(f.periodo).toBeNull();
		expect(f.relogio).toBeNull();
	});

	it('um jogo com resultado e sem ficha mostra o resultado e diz-se terminado', () => {
		const f = fichaDaAgenda(jogo({ gc: 3, gf: 1 }));
		expect([f.golos_casa, f.golos_fora]).toEqual([3, 1]);
		expect(f.situacao).toBe('Jogo Terminado');
		expect(f.estado).toBe('Jogo Terminado');
	});

	it('respeita a situação que a ronda ao vivo escreveu na agenda', () => {
		const f = fichaDaAgenda(jogo({ situacao: 'Intervalo', periodo: 'Intervalo' }));
		expect(f.situacao).toBe('Intervalo');
		expect(f.periodo).toBe('Intervalo');
	});

	/**
	 * As listas vazias não são um detalhe: são o que faz a página **não** mostrar separadores
	 * de eventos e de equipas, em vez de os mostrar vazios.
	 */
	it('as listas vêm vazias, não em falta', () => {
		const f = fichaDaAgenda(jogo());
		expect(f.equipas).toEqual([]);
		expect(f.cronologia).toEqual([]);
		expect(f.arbitros).toEqual([]);
		expect(f.boletim).toBeNull();
	});
});

describe('uma ficha publicada sem nomes', () => {
	// o jogo 9521, tal como estava em produção a 31/10/2026 às 15:30
	const vazia = () => ({ ...fichaDaAgenda(jogo()), casa: '', fora: '', id: 9521 });
	const parede = jogo({ id: 9521, casa: 'PAREDE FC A', fora: 'FSE/AJ SALESIANA', cat: 'SUB-13' });

	it('fica com os nomes da agenda', () => {
		const f = comNomesDaAgenda(vazia(), parede);
		expect([f.casa, f.fora]).toEqual(['PAREDE FC A', 'FSE/AJ SALESIANA']);
	});

	it('mas os nomes da ficha, quando os há, mandam', () => {
		const f = comNomesDaAgenda({ ...vazia(), casa: 'PAREDE FC', fora: 'SALESIANA' }, parede);
		expect([f.casa, f.fora]).toEqual(['PAREDE FC', 'SALESIANA']);
	});

	it('e sem o jogo na agenda fica como veio', () => {
		const f = vazia();
		expect(comNomesDaAgenda(f, null)).toBe(f);
	});
});
