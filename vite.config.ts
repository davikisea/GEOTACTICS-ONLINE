import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    define: {
      'process.env': {},
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@domains': path.resolve(__dirname, 'src/domains'),
        '@shared': path.resolve(__dirname, 'src/shared'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      target: 'es2022',
      minify: 'esbuild',
      cssMinify: true,
      assetsInlineLimit: 4096,
      chunkSizeWarningLimit: 650,
      rollupOptions: {
        output: {
          manualChunks(id) {
            const normalizedId = id.replace(/\\/g, '/');
            if (normalizedId.includes('node_modules/react/') || normalizedId.includes('node_modules/react-dom/')) {
              return 'vendor-react';
            }
            if (normalizedId.includes('node_modules/lucide-react/')) {
              return 'vendor-lucide';
            }
            if (normalizedId.includes('node_modules/@supabase/')) {
              return 'vendor-supabase';
            }
            if (normalizedId.includes('node_modules/motion/')) {
              return 'vendor-motion';
            }
          },
        },
      },
    },
  };
});
