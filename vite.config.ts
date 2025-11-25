import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  define: {
    // This replaces process.env.API_KEY in the code with the actual string value during build.
    // It prevents "process is not defined" crashes on Android.
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
  }
});