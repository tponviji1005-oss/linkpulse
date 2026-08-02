import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    ssr: true,
    outDir: 'C:/Users/tponv/linkpulse/frontend/ssr-run',
    rollupOptions: {
      input: 'C:/Users/tponv/linkpulse/frontend/ssr-error-harness.jsx',
    },
  },
});
