import { describe, expect, it } from 'vitest';
import { tabelasDe } from './classificacao';
import type { GrupoClassificacao } from './tipos';

const grupo = (nome: string | null): GrupoClassificacao =>
	({ nome, linhas: [{ equipa: 'A' }] }) as unknown as GrupoClassificacao;

describe('qual das duas tabelas se mostra', () => {
	it('a da fonte manda, mesmo quando também há uma nossa', () => {
		const t = tabelasDe({
			classificacao: [grupo('SERIE A')],
			classificacao_calculada: [grupo('calculada')]
		});
		expect(t.calculada).toBe(false);
		expect(t.grupos[0].nome).toBe('SERIE A');
	});

	it('sem tabela da fonte, mostra-se a nossa e marca-se como calculada', () => {
		const t = tabelasDe({ classificacao: [], classificacao_calculada: [grupo(null)] });
		expect(t.calculada).toBe(true);
		expect(t.grupos).toHaveLength(1);
	});

	it('sem nenhuma das duas, não há tabela e não há rótulo a mostrar', () => {
		expect(tabelasDe({ classificacao: [] })).toEqual({ grupos: [], calculada: false });
	});

	/**
	 * Um ficheiro publicado antes de 07/10/2026 não tem a chave nova — e um telemóvel pode
	 * ter um desses em cache enquanto já corre o código novo.
	 */
	it('um ficheiro antigo, sem a chave nova, não estoura', () => {
		expect(tabelasDe({ classificacao: [] }).grupos).toEqual([]);
		expect(tabelasDe(null).grupos).toEqual([]);
		expect(tabelasDe(undefined).calculada).toBe(false);
	});
});
