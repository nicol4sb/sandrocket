import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@sandrocket/contracts': path.resolve(
        __dirname,
        '../../packages/contracts/src'
      )
    },
    // Prioritize .tsx and .ts files over .js files
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.json']
  },
  build: {
    rollupOptions: {
      output: {
        // Ensure all scripts are external files, not inline
        inlineDynamicImports: false,
      },
    },
    // Disable inline scripts in production
    modulePreload: {
      polyfill: false, // Disable the modulepreload polyfill that creates inline scripts
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:9000',
        changeOrigin: true,
        secure: false
      }
    },
    // Force HMR to reload on file changes
    watch: {
      usePolling: false,
      interval: 100
    }
  },
  // Ensure we don't use stale compiled files
  optimizeDeps: {
    force: true
  }
});

