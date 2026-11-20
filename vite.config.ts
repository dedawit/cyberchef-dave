import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cyberChefNodeApiPlugin } from './server/apiMiddleware';

export default defineConfig({
  plugins: [react(), cyberChefNodeApiPlugin()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
});
