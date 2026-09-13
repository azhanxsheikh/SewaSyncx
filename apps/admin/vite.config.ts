import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.resolve(__dirname),
  envDir: path.resolve(__dirname, '../../'),
  server: {
    port: 3003,
    strictPort: true,
    host: '0.0.0.0',
  },
  build: {
    outDir: path.resolve(__dirname, '../../dist/admin'),
    emptyOutDir: true,
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../src'),
      '@shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@sewasync/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
});
