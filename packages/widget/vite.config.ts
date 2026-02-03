import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'VeeoWidget',
      fileName: 'veeo-widget',
      formats: ['iife', 'es']
    },
    rollupOptions: {
      output: {
        assetFileNames: 'veeo-widget.[ext]'
      }
    },
    cssCodeSplit: false
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production')
  }
});
