import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    target: 'ES2020',
    outDir: 'dist',
    lib: {
      entry: 'src/main.ts',
      formats: ['cjs']
    }
  }
});
