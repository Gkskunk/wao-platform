pyenv: cannot rehash: /Users/gregkerr/.pyenv/shims isn't writable
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react()],
  build: { outDir: '../dist/team', emptyOutDir: true },
});
