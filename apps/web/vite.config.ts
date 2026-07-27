import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// apps/web has "type": "module", so this config file has no `__dirname` —
// derive it from import.meta.url instead (works whether Vite loads this
// config as ESM or bundles it to CJS internally).
const dirname = path.dirname(fileURLToPath(import.meta.url))
const sharedSrc = path.resolve(dirname, '../../packages/shared/src')

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  server: {
    // Same-origin '/api' in dev mirrors the production nginx routing
    // ('/' -> web container, '/api' -> api container), so the frontend
    // always calls relative URLs and never deals with CORS.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  resolve: {
    // DEV ONLY (2026-07-26, fixing a recurring "edit shared, must restart
    // dev server to see it" complaint): point every @mbc360/shared/* import
    // straight at its TypeScript SOURCE instead of the compiled `dist`
    // package. Source is real ESM (`export` syntax, no CJS ambiguity), so
    // Vite transforms it on the fly exactly like app code in apps/web/src —
    // real file-watch + HMR, no restart needed when packages/shared changes.
    // This replaces the previous `optimizeDeps.include` + `force: true`
    // approach, which pre-bundled the compiled CJS `dist` output once at
    // server START and never re-checked it afterwards (Vite treats a
    // "dependency" pre-bundle as immutable for the rest of the dev session
    // by design) — so editing shared always required a full restart to be
    // seen, even though packages/shared's own `tsc --watch` (part of
    // `npm run dev`) had already recompiled `dist` within a second.
    //
    // Left untouched for `vite build` (production): it still resolves
    // through package.json's `exports` map to the compiled `dist`, same as
    // before — apps/api is unaffected either way, it never goes through Vite.
    alias:
      command === 'serve'
        ? [
            { find: '@mbc360/shared/types', replacement: path.join(sharedSrc, 'types/index.ts') },
            { find: /^@mbc360\/shared\/config\/(.+)$/, replacement: path.join(sharedSrc, 'config/$1.ts') },
            { find: /^@mbc360\/shared\/utils\/(.+)$/, replacement: path.join(sharedSrc, 'utils/$1.ts') },
          ]
        : [],
  },
}))
