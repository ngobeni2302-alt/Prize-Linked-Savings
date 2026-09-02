import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        savings: resolve(__dirname, 'savings.html'),
        game: resolve(__dirname, 'game.html'),
        referrals: resolve(__dirname, 'referrals.html'),
      },
    },
  },
});
