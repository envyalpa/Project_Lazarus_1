import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	ssr: {
		noExternal: ['@lucide/svelte'],
		external: ['better-sqlite3']
	},
	server: {
		watch: {
			ignored: ['**/data/**']
		}
	},
	build: {
		rollupOptions: {
			output: {
				manualChunks(id) {
					if (id.includes('@lucide/svelte')) {
						return 'lucide-icons';
					}
				}
			}
		}
	}
});
