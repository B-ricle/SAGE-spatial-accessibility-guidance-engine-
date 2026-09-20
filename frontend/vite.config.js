import { defineConfig } from 'vite';
export default defineConfig({
  server: { proxy: {
    '/ws': { target: process.env.SAGE_DEV_BACKEND || 'ws://127.0.0.1:8000', ws: true },
    '/api': { target: process.env.SAGE_DEV_API || 'http://127.0.0.1:8000' },
  } },

});
