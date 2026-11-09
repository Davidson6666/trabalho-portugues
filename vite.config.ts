import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // A cena 3D (three.js + react-three-fiber) vira um chunk próprio,
    // carregado sob demanda enquanto a abertura roda.
    chunkSizeWarningLimit: 1200,
  },
});
