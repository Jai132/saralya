/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { fileURLToPath } from 'node:url';

// GitHub Pages serves the site at /<repo-name>/. Change this one constant if the repo is renamed.
export const REPO_BASE = '/saralya/';

export default defineConfig(({ command, mode }) => ({
  base: command === 'build' ? REPO_BASE : '/',
  plugins: [react(), ...(mode === 'https' ? [basicSsl()] : [])],
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        house_model: fileURLToPath(new URL('./house_model.html', import.meta.url)),
        pharmacy_store: fileURLToPath(new URL('./pharmacy_store.html', import.meta.url)),
      },
    },
  },
  server: {
    port: 5173,
    // Large media is copied in while the server runs; Windows locks it mid-copy and the watcher crashes on EBUSY.
    // Public media is served straight from disk, so it never needs watching — but Vite only learns of new public
    // files through the watcher, so restart the dev server after adding or renaming a video.
    watch: { ignored: ['**/*.{mp4,mov,webm,mkv}'] },
  },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
}));
