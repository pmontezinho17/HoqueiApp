import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
// A versão vem de um só sítio. Ver `src/lib/versao.ts` para a razão — em resumo: sem isto o
// SvelteKit usa o relógio e cada publicação avisa todos os utilizadores.
import { VERSAO } from './src/lib/versao';

export default defineConfig({
	plugins: [
		sveltekit({
			preprocess: vitePreprocess(),
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// NOTA: nesta versão do SvelteKit TODA a configuração vive aqui, dentro do
			// plugin. Um svelte.config.js é ignorado em silêncio — o build corre na mesma
			// e sai com o adapter errado. Por isso este projeto não tem esse ficheiro.
			// Estáticos puros: a PWA e os JSON saem do mesmo projeto Cloudflare Pages,
			// logo não há CORS e o service worker trata dos dois da mesma maneira.
			adapter: adapter({ fallback: 'index.html', precompress: false }),
			/**
			 * **A versão fixa, e não o relógio.** Por omissão o SvelteKit põe aqui
			 * `Date.now()`, e isso entra no pacote do cliente: medido a 10/10/2026, duas
			 * construções do mesmo código davam 17 revisões diferentes no service worker, e
			 * cada revisão diferente faz aparecer o aviso de actualização a quem usa a app.
			 *
			 * Com a versão fixa, duas construções do mesmo código são iguais byte a byte.
			 */
			version: { name: VERSAO }
		}),
		SvelteKitPWA({
			registerType: 'prompt',
			manifest: {
				// o nome vive em `src/lib/sitio.ts`; aqui não dá para o importar, porque isto
				// corre na configuração do Vite e não na app. O que se partilha é a variável:
				// só o `testes.yml` a define, e é o que separa o site de testes da principal
				name: process.env.VITE_APP_NOME || 'OK4Sticks',
				// doze caracteres é onde o ecrã principal corta, e o nome completo tem treze
				short_name: 'OK4Sticks',
				description: 'Resultados, calendários e classificações de hóquei em patins em Portugal',
				lang: 'pt-PT',
				// **A app instalada abre nos Jogos**, por decisão do dono a 10/10/2026.
				//
				// Abria em O Meu Clube, com um raciocínio que parecia bom: com favoritos
				// mostra-os, e sem eles serve de onboarding em vez de um ecrã vazio. O erro
				// estava na premissa — os Jogos **nunca** são um ecrã vazio. São a lista do
				// dia, que é o que a app faz, e num sábado tem trinta e seis linhas. Quem
				// abre uma app de resultados quer resultados; escolher o clube é uma coisa
				// que se faz uma vez.
				start_url: '/',
				display: 'standalone',
				background_color: '#0f1115',
				// amarelo torrado: é a cor do ícone, e é ela que o Android usa para tingir o
				// arranque e o alternador de aplicações. O acento da interface continua verde
				theme_color: '#c8860d',
				icons: [
					{ src: '/icones/icone-192.png', sizes: '192x192', type: 'image/png' },
					{ src: '/icones/icone-512.png', sizes: '512x512', type: 'image/png' },
					{ src: '/icones/icone-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
				]
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,png,ico,svg}'],
				// **Os caminhos que são Pages Functions têm de chegar ao servidor.** O service
				// worker intercepta **todas** as navegações e responde-lhes com o `index.html`;
				// como o SvelteKit não tem rota para nenhum destes, o que aparece é um ecrã
				// vazio — a aplicação a carregar e a não encontrar nada para desenhar.
				//
				// O `/consola` entrou aqui a 09/10/2026 e custou ao dono abrir um ecrã branco: eu
				// tinha posto o `/contagens` nesta lista quando ele nasceu, e esqueci-me de fazer
				// o mesmo para a consola no dia em que ela passou a ser servida pelo site. **Quem
				// acrescentar uma Function em `web/functions/` acrescenta-a aqui no mesmo
				// commit** — e o teste ao lado recusa quem não o fizer.
				//
				// O `/contar` está aqui por **regra e não por necessidade**: é um `fetch` e não
				// uma navegação, logo a regra de navegação nunca lhe toca. Mas uma lista com
				// excepções é uma lista que se discute a cada entrada nova, e foi uma discussão
				// dessas que deixou o `/consola` de fora. A regra sem excepções é mais barata:
				// **toda a Function está nesta lista.**
				navigateFallbackDenylist: [/^\/contagens/, /^\/consola/, /^\/contar/],
				// 31 emblemas × 2,3 KB = 70 KB: vale a pena tê-los offline na app instalada
				runtimeCaching: [
					{
						// imutáveis: uma vez em cache nunca mais se vai à rede
						urlPattern: ({ url }) => url.pathname.startsWith('/emblemas/'),
						handler: 'CacheFirst',
						options: { cacheName: 'emblemas', expiration: { maxEntries: 200 } }
					},
					{
						// O que muda durante um jogo vai à rede PRIMEIRO.
						//
						// Estes ficheiros estavam em StaleWhileRevalidate como todos os outros, e
						// com live scores isso é veneno: serve-se a cópia em cache e só depois se
						// busca a nova, por isso o utilizador está **sempre um recarregamento
						// atrasado**. Puxava para recarregar e via o resultado anterior; puxava
						// outra vez e via o certo. Com um jogo a decorrer é inaceitável.
						//
						// 3 segundos de espera pela rede e depois cai na cache: num pavilhão com
						// rede má continua a abrir, só com dados mais velhos — que é o
						// compromisso certo nesta direcção e não na outra.
						urlPattern: ({ url }) =>
							/^\/v1\/[^/]+\/[^/]+\/(agenda|meta)\.json$/.test(url.pathname) ||
							/^\/v1\/[^/]+\/[^/]+\/match\//.test(url.pathname),
						handler: 'NetworkFirst',
						options: {
							cacheName: 'dados-ao-vivo',
							networkTimeoutSeconds: 3,
							expiration: { maxEntries: 300, maxAgeSeconds: 604800 }
						}
					},
					{
						// o resto muda a cada corrida do cron: servir já o que está em cache e
						// atualizar por trás, para a app abrir instantânea mesmo com 3G mau
						urlPattern: ({ url }) => url.pathname.startsWith('/v1/'),
						handler: 'StaleWhileRevalidate',
						options: { cacheName: 'dados-v1', expiration: { maxEntries: 200, maxAgeSeconds: 604800 } }
					}
				]
			}
		})
	]
});
