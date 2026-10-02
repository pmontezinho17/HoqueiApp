// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

// os módulos virtuais do vite-plugin-pwa não entram pelo tsconfig sozinhos
/// <reference types="vite-plugin-pwa/svelte" />
/// <reference types="vite-plugin-pwa/info" />
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
