/**
 * Uma ficha montada a partir da agenda, para os jogos que ainda não têm ficha publicada.
 *
 * ## O defeito, medido a 09/10/2026
 *
 * A fonte só publica a ficha de um jogo **quando ele começa**. Antes disso não existe
 * `match/<id>.json` — e nenhum dos 76 jogos do fim de semana de 10–11/10 tinha ficha.
 *
 * O que acontecia ao tocar num desses jogos era o pior resultado possível:
 *
 * 1. o `adapter-static` serve o `index.html` como *fallback* para qualquer caminho que não
 *    exista, **com estado 200**;
 * 2. o `json()` via `r.ok` verdadeiro e tentava interpretar HTML como JSON;
 * 3. o `+page.ts` apanhava o erro e atirava um 404;
 * 4. o utilizador lia **"Não foi possível carregar os jogos — verifica a ligação à
 *    internet"** num telemóvel com rede perfeita.
 *
 * Numa manhã de sábado com 36 jogos, isso é a app a dizer a quem a abre que o problema é
 * dele. O dono já tinha apanhado um sintoma deste problema — o ecrã em branco antes do apito
 * — e o que se corrigiu então foi a ficha de convocatória, que é outro caso: ali a ficha
 * existe e está vazia. Aqui não existe nenhuma.
 *
 * ## A correcção
 *
 * **A app já sabe tudo o que precisa para desenhar a página antes do jogo.** A agenda traz as
 * equipas, a hora, o recinto, a prova, o escalão e o id da competição — logo a classificação
 * também. Não falta informação: faltava usá-la.
 *
 * O `tem_ficha` da agenda **não serve** para decidir isto: está ausente até em jogos que têm
 * ficha, verificado no 9657. A regra que vale é a que não depende de nenhum sinalizador —
 * tenta-se buscar a ficha e, se ela não estiver publicada, monta-se esta.
 *
 * Isto cobre também um caso que não é o do pré-jogo: um jogo já disputado cuja ficha não
 * chegou a ser publicada passa a mostrar o resultado e o contexto, em vez de um erro.
 */
import type { FichaJogo, JogoAgenda } from './tipos';

const FECHADO = 'Jogo Terminado';

export function fichaDaAgenda(j: JogoAgenda): FichaJogo {
	const disputado = j.gc !== null && j.gf !== null;
	return {
		id: j.id as number,
		competicao: j.prova ?? null,
		competicao_id: j.comp,
		casa: j.casa,
		fora: j.fora,
		golos_casa: j.gc,
		golos_fora: j.gf,
		// `estado` e `situacao` dizem a verdade do que a agenda sabe, e nada mais: um jogo com
		// resultado está terminado, um jogo marcado está por começar. Inventar "1ª Parte" aqui
		// punha a app a afirmar o que não observou.
		estado: disputado ? FECHADO : null,
		situacao: disputado ? FECHADO : (j.situacao ?? 'Por começar'),
		periodo: j.periodo ?? null,
		relogio: j.relogio ?? null,
		data: j.data,
		hora: j.hora,
		recinto: j.recinto,
		// vazios, e é por isso que os separadores de eventos e de equipas não aparecem
		arbitros: [],
		faltas: [null, null],
		equipas: [],
		cronologia: [],
		boletim: null,
		categoria: j.cat,
		grupo_id: j.grupo_id,
		grupo_nome: j.grupo_nome,
		serie: j.serie
	};
}
