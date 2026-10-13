/// <reference types="vitest" />

import { sentryVitePlugin } from '@sentry/vite-plugin';
import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';
import { defineConfig } from 'vite';
import eslint from 'vite-plugin-eslint';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import svgr from 'vite-plugin-svgr';
import tsconfigPaths from 'vite-tsconfig-paths';

const commitHash = execSync('git rev-parse --short HEAD').toString().trim();

// const ReactCompilerConfig = {
//   target: '18' // '17' | '18' | '19'
// };

export default defineConfig({
  define: {
    'import.meta.env.VITE_COMMIT_HASH': JSON.stringify(commitHash)
  },
  plugins: [
    // react({
    //   babel: {
    //     plugins: [['babel-plugin-react-compiler', ReactCompilerConfig]]
    //   }
    // }),
    react(),
    tsconfigPaths(),
    svgr(),
    nodePolyfills({
      protocolImports: true
      // exclude: ['http', 'http2', 'https']
    }),
    eslint({ fix: true }),
    sentryVitePlugin({
      org: 'dusa-labs',
      project: 'dex'
    })
  ],
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
      define: { global: 'globalThis' },
      supported: { bigint: true }
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
        silenceDeprecations: ['legacy-js-api']
      }
    }
  },
  build: {
    target: 'esnext',
    // rollupOptions: { treeshake: true },
    sourcemap: false
  },
  // @ts-ignore
  test: { environment: 'jsdom' }
});
