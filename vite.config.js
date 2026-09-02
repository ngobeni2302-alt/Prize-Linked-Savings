import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        ticket: resolve(__dirname, 'ticket.html'),
        savings: resolve(__dirname, 'savings.html'),
        referrals: resolve(__dirname, 'referrals.html'),
      },
    },
  },
});
