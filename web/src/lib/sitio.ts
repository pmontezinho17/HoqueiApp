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

/** Só o nome, para assuntos de email e textos onde um URL completo é ruído. */
export const SITIO_NOME = 'hoquei.pages.dev';
