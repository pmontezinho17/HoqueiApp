import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * A confirmação de envio da caixa "O que está mal" tem de ser vista.
 *
 * ## O que falhou, e porque é que é um teste e não só um cuidado
 *
 * A 13/10/2026 o dono mandou **duas** sugestões do site de testes. As duas chegaram à base de
 * dados — está medido, estão lá as linhas — e o que ele escreveu a seguir foi: *"depois de
 * carregar no enviar podia estar uma mensagem de mensagem enviada"*. Havia confirmação: uma
 * linha de `--t-micro` por baixo da caixa de texto, e o painel fechava-se 1,6 s depois.
 * Enviou duas vezes sem ver nenhuma das duas.
 *
 * O defeito não era a frase, era ela ser a coisa mais pequena do ecrã no instante a seguir ao
 * toque, e desaparecer sozinha antes de alguém reparar que tinha mudado alguma coisa.
 *
 * **Este teste lê o ficheiro como texto**, que é o que os outros testes deste projecto fazem
 * com os `.svelte` — não há aqui montagem de componentes. É fraco para afirmar o que se vê, e
 * forte exactamente onde o defeito estava: impede que o fecho automático volte, e impede que a
 * confirmação volte a ser uma nota de rodapé. O que ele não substitui é olhar para o ecrã, e
 * isso está feito a 375×812 nos dois temas.
 */
describe('a confirmação de envio', () => {
	const fonte = readFileSync(new URL('./Feedback.svelte', import.meta.url), 'utf-8');

	it('não se fecha sozinha', () => {
		// Qualquer relógio neste ficheiro é suspeito: o único que cá houve fechava o painel
		// 1,6 s depois de enviar, e foi por isso que ninguém viu a mensagem.
		expect(fonte).not.toMatch(/setTimeout/);
	});

	it('é anunciada a quem ouve a página', () => {
		expect(fonte).toMatch(/role="status"/);
	});

	it('substitui o formulário em vez de se acrescentar a ele', () => {
		// Com o formulário à vista, a confirmação é mais uma linha entre dez. Sem ele, o painel
		// inteiro é a confirmação. O `{:else}` é o que garante que são estados alternativos.
		const bloco = fonte.slice(fonte.indexOf("{#if estado === 'enviado'}"));
		expect(bloco).toMatch(/\{:else\}/);
		expect(bloco.indexOf('<textarea')).toBeGreaterThan(bloco.indexOf('{:else}'));
	});

	it('todos os caminhos de fecho voltam a pôr a caixa no princípio', () => {
		// Se um fecho não reiniciar o estado, quem abrir a seguir encontra a confirmação do
		// envio anterior — e acredita que acabou de enviar outra vez.
		const fechos = fonte.match(/critica\.fechar\(\)/g) ?? [];
		expect(fechos).toHaveLength(1); // só o que está dentro do `fecharEReiniciar`
		const envolvente = fonte.slice(0, fonte.indexOf('critica.fechar()'));
		expect(envolvente).toMatch(/function fecharEReiniciar\(\) \{\s*$/);
	});

	it('o botão de fechar da confirmação é tocável num telemóvel', () => {
		// 44px é o mínimo da Apple e é o que os outros botões desta caixa já usam.
		const css = fonte.slice(fonte.indexOf('.fechar-grande'));
		expect(css).toMatch(/min-height:\s*44px/);
	});
});
