import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

const GA_MEASUREMENT_ID = 'G-CSY0ZFPFZD';

/**
 * Inject the Google Analytics (gtag.js) tag into the built `index.html`.
 * `apply: 'build'` keeps it out of the dev server and the Playwright suite, so
 * only real production deploys report page views.
 */
function googleAnalytics(measurementId: string): Plugin {
  return {
    name: 'obsipix:google-analytics',
    apply: 'build',
    transformIndexHtml() {
      return [
        {
          tag: 'script',
          injectTo: 'head',
          attrs: {
            async: true,
            src: `https://www.googletagmanager.com/gtag/js?id=${measurementId}`,
          },
        },
        {
          tag: 'script',
          injectTo: 'head',
          children: [
            'window.dataLayer = window.dataLayer || [];',
            'function gtag(){dataLayer.push(arguments);}',
            "gtag('js', new Date());",
            `gtag('config', '${measurementId}');`,
          ].join('\n'),
        },
      ];
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  // Served from the domain root everywhere except GitHub Pages, which hosts the
  // build under https://<user>.github.io/Obsipix/. Vercel (and any other host)
  // sets no such prefix, so `VERCEL` — or an explicit DEPLOY_BASE — wins.
  base:
    process.env.DEPLOY_BASE ??
    (process.env.VERCEL ? '/' : mode === 'production' ? '/Obsipix/' : '/'),
  plugins: [react(), googleAnalytics(GA_MEASUREMENT_ID)],
  resolve: {
    alias: {
      '@core': fileURLToPath(new URL('./src/core', import.meta.url)),
      '@rendering': fileURLToPath(new URL('./src/rendering', import.meta.url)),
      '@app': fileURLToPath(new URL('./src/app', import.meta.url)),
      '@editor': fileURLToPath(new URL('./src/editor', import.meta.url)),
      '@infrastructure': fileURLToPath(new URL('./src/infrastructure', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'tests/unit/**/*.{test,spec}.{ts,tsx}'],
  },
}));
