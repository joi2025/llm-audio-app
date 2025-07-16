import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3002,
    host: true,
    open: true,
    strictPort: true // Esto asegura que Vite falle si no puede usar el puerto especificado
  }
});
