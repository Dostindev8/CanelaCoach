import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
        timeout: 30_000,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            console.warn('[vite proxy]', err.message);
            if (res && !res.headersSent && 'writeHead' in res) {
              (res as import('http').ServerResponse).writeHead(502, {
                'Content-Type': 'application/json',
              });
              (res as import('http').ServerResponse).end(
                JSON.stringify({
                  ok: false,
                  error: {
                    message: 'API no disponible. Espera a que el backend inicie en :4000',
                    code: 'API_UNAVAILABLE',
                  },
                })
              );
            }
          });
        },
      },
    },
  },
});
