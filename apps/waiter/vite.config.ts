import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    process.env.ANALYZE === 'true' &&
      visualizer({
        filename: 'dist/bundle-stats.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
        template: 'treemap',
      }),
  ].filter(Boolean),
  envDir: '../..',
  // Older phones (iOS 14+, Android WebView/Chrome 87+) — Vite 8's default
  // baseline target (Safari 16+) white-screens anything older.
  build: { target: ['es2019', 'chrome87', 'safari14'] },
  server: { host: true, port: 5175, strictPort: true },
  test: { environment: 'node' },
});
