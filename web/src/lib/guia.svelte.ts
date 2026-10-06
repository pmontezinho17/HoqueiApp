/**
 * O tour guiado da primeira visita.
 *
 * **Como é que isto não se parte.** Um tour com holofote aponta para posições no ecrã, e
 * esta interface mudou todas as semanas — a barra de navegação passou de cima para baixo, a
 * fita de dias nasceu, os separadores do jogo mudaram de texto para ícones. Um tour com
 * coordenadas escritas à mão estaria errado ao terceiro dia.
 *
 * Por isso nenhum passo conhece uma posição. Cada passo conhece um **nome**, e é a própria
 * interface que declara quem responde a esse nome, com um `data-guia="..."`. A posição é
 * medida no momento em que o passo abre.
 *
 * E há uma regra que trata do resto: **um passo cujo alvo não esteja no ecrã é saltado em
 * silêncio**. Se amanhã os chips de escalão desaparecerem, o tour passa a ter cinco passos
 * em vez de seis e ninguém vê um holofote a apontar para o vazio. É também isso que faz
 * funcionar os passos que só às vezes existem — a secção dos jogos a decorrer só está lá
 * quando há um jogo a decorrer.
 */
import { browser } from '$app/environment';
import { favoritos } from './favoritos.svelte';
import { caminhoEquipa } from './slug';

/** Um passo: o nome do alvo, o título e o texto. */
export type Passo = {
	/** o valor de `data-guia` do elemento a iluminar */
	alvo: string;
	titulo: string;
	texto: string;
	/**
	 * O ecrã onde este passo vive. Ausente quer dizer a lista de jogos, `/`.
	 *
	 * Pode ser uma função, para os ecrãs cujo caminho depende do estado — a página de uma
	 * equipa é `/equipa/<escalão>/<clube>`, e qual deles depende de quem a pessoa segue.
	 * Devolver `null` diz que o passo não se aplica a esta pessoa, e ele é saltado.
	 */
	caminho?: string | (() => string | null);
	/**
	 * Parâmetros que o ecrã do passo tem de ter.
	 *
	 * É assim que o guia **conduz** em vez de só apontar: as abas da página de equipa vivem
	 * no endereço, e um passo que declare `{ aba: 'classificacao' }` leva a pessoa à aba
	 * certa sem o guia tocar no estado interno dessa página.
	 *
	 * Comparam-se só os parâmetros declarados. A lista de jogos reescreve o `?dia=` sozinha,
	 * e comparar o endereço todo punha o guia a navegar em círculo.
	 */
	params?: Record<string, string>;
};

/** O caminho de um passo, já resolvido. `null` quer dizer "salta". */
export function caminhoDe(passo: Passo): string | null {
	if (!passo.caminho) return '/';
	return typeof passo.caminho === 'function' ? passo.caminho() : passo.caminho;
}

/** O endereço completo de um passo, com os parâmetros que ele exige. */
export function enderecoDe(passo: Passo): string | null {
	const c = caminhoDe(passo);
	if (c === null) return null;
	const p = new URLSearchParams(passo.params ?? {});
	return p.size ? `${c}?${p}` : c;
}

/** Já estamos no ecrã deste passo? Compara o caminho e só os parâmetros declarados. */
export function estaNoEcra(passo: Passo, caminho: string, params: URLSearchParams): boolean {
	if (caminhoDe(passo) !== caminho) return false;
	for (const [k, v] of Object.entries(passo.params ?? {})) {
		if (params.get(k) !== v) return false;
	}
	return true;
}

/**
 * A página de uma equipa, para os passos que vivem lá.
 *
 * Prefere uma que a pessoa siga — é a dela, e o tour fala-lhe do que lhe interessa. Quem
 * não segue nenhuma vai a uma equipa real qualquer, escolhida dos dados do dia.
 *
 * **Deliberadamente não inventa um favorito para o tour.** Era a saída óbvia e é a errada:
 * escrever nos favoritos de alguém para lhe mostrar um guia deixa lixo atrás se o tour for
 * interrompido — e um telemóvel que fecha a app a meio é o caso normal, não a excepção. A
 * página de uma equipa rende bem para qualquer equipa, seguida ou não, por isso não há
 * nada a simular.
 */
function umaEquipa(): string | null {
	const f = favoritos.lista[0];
	if (f) return caminhoEquipa(f.equipa, f.categoria);
	return guia.equipaExemplo;
}

/**
 * Seis passos, e param todos na lista de jogos e na barra de baixo.
 *
 * Deliberadamente **não** entram dentro de um jogo: para isso o tour teria de escolher um
 * jogo que existisse, com ficha publicada, e numa segunda-feira de Agosto não existe
 * nenhum. O que se perdia — que lá dentro também se arrasta para o lado — diz-se no passo
 * dos jogos, onde a pessoa está a olhar para eles.
 */
export const PASSOS: Passo[] = [
	{
		alvo: 'equipa-abas',
		caminho: umaEquipa,
		params: { aba: 'resumo' },
		titulo: 'A tua equipa, em resumo',
		texto:
			'Os últimos resultados, o próximo jogo e a posição na tabela. É o que se quer ver de relance, e é o que abre.'
	},
	{
		alvo: 'equipa-vistas',
		caminho: umaEquipa,
		params: { aba: 'jogos', vista: 'lista' },
		titulo: 'Todos os jogos',
		texto:
			'A época inteira, jogados e por jogar. Se a equipa anda em mais do que uma prova, podes ver só uma.'
	},
	{
		alvo: 'equipa-calendario',
		caminho: umaEquipa,
		params: { aba: 'jogos', vista: 'calendario' },
		titulo: 'E em calendário',
		texto:
			'O mês à vista. Aqui podes subscrever o calendário da equipa: os jogos passam a aparecer no calendário do telefone, com o recinto, e mudam sozinhos se a associação mudar a hora.'
	},
	{
		alvo: 'equipa-abas',
		caminho: umaEquipa,
		params: { aba: 'classificacao' },
		titulo: 'A classificação',
		texto:
			'A tabela da prova, com a tua equipa em destaque. Um resultado ao vivo ainda não conta para a tabela, e a app diz-te quando é esse o caso.'
	},
	{
		alvo: 'equipa-abas',
		caminho: umaEquipa,
		params: { aba: 'plantel' },
		titulo: 'O plantel',
		texto:
			'Quem alinhou e o que fez: golos, assistências e faltas, prova a prova. Nos escalões de formação os nomes são os que a associação publica.'
	},
	{
		alvo: 'dias',
		titulo: 'Os jogos de todos, dia a dia',
		texto:
			'Toca num dia ou arrasta a lista para o lado. Com um jogo a decorrer ele sobe para o topo, com o ponto a pulsar — e o resultado chega em menos de um minuto.'
	},
	{
		alvo: 'escaloes',
		titulo: 'Só o escalão que interessa',
		texto:
			'Num sábado cheio há 40 jogos de nove escalões. Toca num chip e fica só esse; toca outra vez e volta tudo.'
	},
	{
		alvo: 'nav-competicoes',
		titulo: 'Competições',
		texto:
			'Todas as provas da região, com a tabela e os melhores marcadores de cada uma.'
	},
	{
		// Último passo de propósito: a seguir a ver o que a app faz, é a altura de dizer o
		// que falta nela. E este passo sai sozinho quando o botão sair: a regra do salto
		// trata disso, porque o `RECOLHER_FEEDBACK` deixa de montar o alvo.
		alvo: 'feedback',
		titulo: 'Diz-nos o que está mal',
		texto:
			'Este botão está aqui enquanto a app estiver a ser testada. Escreve o que te incomodou ou o que falta — nada sai do teu telemóvel sem seres tu a carregar em enviar.'
	}
];

/**
 * O primeiro passo, a partir de `i`, que se aplica.
 *
 * É aqui que vive a regra que impede este tour de apontar para o vazio — e está fora do
 * componente, com a avaliação injectada, para poder ser testada sem um DOM nem um router.
 * Uma mudança de desenho custa um passo, não um holofote em cima de nada.
 */
export function primeiroComAlvo(
	i: number,
	existe: (passo: Passo) => boolean
): number | null {
	for (let k = Math.max(0, i); k < PASSOS.length; k++) {
		if (existe(PASSOS[k])) return k;
	}
	return null;
}

/**
 * A marca de "já vi", **na versão 2**.
 *
 * Mudou de nome a 06/10/2026 e os dois motivos interessam. O primeiro é o pedido do dono:
 * o guia tem de aparecer outra vez a **todos**, incluindo a quem já o viu — e faz sentido,
 * porque o guia que essas pessoas viram era outro, sem a escolha de equipas e sem os cinco
 * passos da página de equipa. O segundo é que a chave antiga, `guia-visto`, era a única
 * fora da convenção `hoquei:…:v1` das outras duas.
 *
 * Subir a versão é o caminho determinista para "mostrar outra vez": cada pessoa vê o guia
 * novo uma vez, e nunca mais. Uma bandeira de "forçar a todos" teria de ser desligada
 * depois, à mão, e quem a desligasse teria de acertar no momento.
 *
 * A próxima vez que o guia mudar a sério, sobe-se para `v3` — e a política de privacidade
 * enumera esta chave pelo nome, logo muda no mesmo commit.
 */
const CHAVE = 'hoquei:guia-visto:v2';

/** A chave da primeira versão. Apaga-se ao passar por aqui: não fica lixo no aparelho. */
const CHAVE_ANTIGA = 'guia-visto';
let limpou = false;

/** Quem já viu o tour **nesta versão** não o volta a ver sozinho. */
function jaViu(): boolean {
	if (!browser) return true;
	try {
		if (!limpou) {
			localStorage.removeItem(CHAVE_ANTIGA);
			limpou = true;
		}
		return localStorage.getItem(CHAVE) === '1';
	} catch {
		// Uma janela privada, ou armazenamento bloqueado. Aqui a escolha certa é **não**
		// mostrar: um tour que aparece a cada visita porque não consegue guardar que já
		// apareceu é pior do que não haver tour nenhum.
		return true;
	}
}

function marcarVisto() {
	try {
		localStorage.setItem(CHAVE, '1');
	} catch {
		/* sem armazenamento não há nada a guardar, e o tour desta visita já foi visto */
	}
}

class Guia {
	/** está a decorrer */
	activo = $state(false);
	/**
	 * O caminho de uma equipa real, para o passo que vive numa página de equipa quando a
	 * pessoa ainda não segue nenhuma. É a lista de jogos que o preenche, porque é ela que
	 * tem a agenda carregada — este módulo não vê os dados.
	 */
	equipaExemplo = $state<string | null>(null);
	/** índice dentro de `PASSOS` — pode saltar números, se houver alvos em falta */
	indice = $state(0);

	get passo(): Passo | null {
		return this.activo ? (PASSOS[this.indice] ?? null) : null;
	}

	/** Arranca, venha de onde vier — do primeiro arranque ou do botão em "Sobre". */
	comecar(doInicio = true) {
		if (doInicio) this.indice = 0;
		this.activo = true;
	}

	/**
	 * **Um tour a decorrer não se reinicia.**
	 *
	 * Isto apanhou-me: desde que os passos passaram a viver em vários ecrãs, o tour navega
	 * para fora da lista de jogos e volta a entrar nela — e o arranque automático dessa
	 * página chamava `talvezComecar` outra vez, que punha o índice a zero. Resultado medido:
	 * o tour dava `/` 1, 2, 3 → `/clube` 1 → `/` 1, 2, 3 → `/clube` 1, para sempre.
	 *
	 * A marca de "já vi" não salva disto, porque só é escrita quando o tour acaba.
	 */
	get aDecorrer(): boolean {
		return this.activo;
	}

	/**
	 * Arranca só na primeira visita.
	 *
	 * Chamado da lista de jogos e não do arranque da app: a app instalada abre em "O Meu
	 * Clube", que sem favoritos já é um ecrã a explicar-se, e os passos deste tour vivem na
	 * lista. Quem instalar vê o tour na primeira vez que abrir os jogos.
	 */
	talvezComecar() {
		if (this.activo || jaViu()) return;
		this.comecar();
	}

	avancar() {
		if (this.indice >= PASSOS.length - 1) return this.sair();
		this.indice += 1;
	}

	recuar() {
		if (this.indice > 0) this.indice -= 1;
	}

	/** Salta para um índice — é o que a procura de alvos em falta usa. */
	irPara(i: number) {
		if (i >= PASSOS.length) return this.sair();
		this.indice = Math.max(0, i);
	}

	sair() {
		this.activo = false;
		marcarVisto();
	}
}

export const guia = new Guia();
