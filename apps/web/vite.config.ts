import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Same-origin '/api' in dev mirrors the production nginx routing
    // ('/' -> web container, '/api' -> api container), so the frontend
    // always calls relative URLs and never deals with CORS.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  optimizeDeps: {
    // @mbc360/shared is an npm workspace symlink, so Vite serves it as
    // source instead of pre-bundling it like a normal node_modules package.
    // Its build output is CommonJS (tsc, no "type": "module") — without
    // forcing it through esbuild here, the dev server's native-ESM import
    // handling can't see named exports on that CJS file and throws
    // "does not provide an export named ...". Production builds (Rollup)
    // don't hit this; only `vite dev` needs the explicit include.
    //
    // `force: true` re-runs this prebundle on every dev server start instead
    // of trusting the on-disk cache in node_modules/.vite/deps. That cache is
    // keyed off the lockfile/config, NOT off packages/shared's dist content —
    // so without `force`, editing shared and restarting `npm run dev` can
    // still serve a stale prebundle (this bit us more than once; see the
    // "Vite optimizeDeps stale cache" note in CLAUDE.md). `npm run dev:clean`
    // (manual cache delete) is no longer needed for this reason, only as a
    // fallback if a stray process is still holding the old cache in memory.
    force: true,
    include: [
      '@mbc360/shared/types',
      '@mbc360/shared/config/gates',
      '@mbc360/shared/config/phases',
      '@mbc360/shared/config/evidence',
      '@mbc360/shared/config/registers',
      '@mbc360/shared/config/changeTriggers',
      '@mbc360/shared/config/roles',
      '@mbc360/shared/utils/gateProgress',
      '@mbc360/shared/utils/ingredientWatch',
      '@mbc360/shared/utils/formulaDiff',
    ],
  },
})
