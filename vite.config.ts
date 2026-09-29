/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

// GitHub Pages serves the site at /<repo-name>/. Change this one constant if the repo is renamed.
export const REPO_BASE = '/saralya/';

export default defineConfig(({ command, mode }) => ({
  base: command === 'build' ? REPO_BASE : '/',
  plugins: [react(), ...(mode === 'https' ? [basicSsl()] : [])],
  server: { port: 5173 },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
}));
