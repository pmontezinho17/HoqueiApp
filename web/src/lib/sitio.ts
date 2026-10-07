/**
 * O endereço público do site, num só sítio.
 *
 * Mesma razão do `contacto.ts`: quando o domínio próprio chegar (B9.27), muda aqui e em mais
 * nenhum lado do cliente.
 *
 * **O que não vive aqui, e não pode viver:** o domínio dos UID dos eventos de calendário.
 * Esse está em `scraper/src/hoquei/ics.py` como `DOMINIO_UID`, congelado de propósito — se
 * seguisse o domínio do site, quem tem o feed subscrito passava a ver cada jogo duas vezes.
 */
export const SITIO = 'https://hoquei.pages.dev';

/**
 * O nome da aplicação, num só sítio.
 *
 * Mudou de "Hóquei em Patins" para este a 07/10/2026, por escolha do dono. Está aqui e não
 * espalhado pelos oito `<title>` das páginas porque já mudou uma vez e pode mudar outra — e
 * oito sítios a dizer o nome divergem no dia em que se muda sete deles.
 *
 * O `NOME_CURTO` é o que aparece debaixo do ícone no ecrã principal, onde o sistema corta
 * por volta dos doze caracteres: `OK4Sticks.DEV` tem treze e ficava truncado.
 */
export const APP_NOME = 'OK4Sticks.DEV';
export const APP_NOME_CURTO = 'OK4Sticks';

/** Só o nome, para assuntos de email e textos onde um URL completo é ruído. */
export const SITIO_NOME = 'hoquei.pages.dev';
