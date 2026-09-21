import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// NOTA: nesta versão do SvelteKit o adapter vive aqui, dentro do plugin —
			// pô-lo no svelte.config.js não dá erro nenhum, é simplesmente ignorado.
			// Estáticos puros: a PWA e os JSON saem do mesmo projeto Cloudflare Pages,
			// logo não há CORS e o service worker trata dos dois da mesma maneira.
			adapter: adapter({ fallback: 'index.html', precompress: false })
		}),
		SvelteKitPWA({
			registerType: 'prompt',
			manifest: {
				name: 'Hóquei em Patins',
				short_name: 'Hóquei',
				description: 'Resultados, calendários e classificações de hóquei em patins em Portugal',
				lang: 'pt-PT',
				start_url: '/',
				display: 'standalone',
				background_color: '#0f1115',
				theme_color: '#0a7d54',
				icons: [
					{ src: '/icones/icone-192.png', sizes: '192x192', type: 'image/png' },
					{ src: '/icones/icone-512.png', sizes: '512x512', type: 'image/png' },
					{ src: '/icones/icone-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
				]
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,png,ico,svg}'],
				runtimeCaching: [
					{
						// os dados mudam sozinhos no CDN: servir já o que está em cache e
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
