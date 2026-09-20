import { defineConfig } from 'vite';

// Development only: the browser uses its own origin; Vite forwards WebSockets.
export default defineConfig({
  server: {
    proxy: { '/ws': { target: process.env.SAGE_DEV_BACKEND || 'ws://127.0.0.1:8000', ws: true } },
  },
});
