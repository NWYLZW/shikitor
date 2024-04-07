import path from 'node:path'

import unbundledReexport from 'rollup-plugin-unbundled-reexport'
import { defineConfig } from 'vite'
import replacer from 'vite-plugin-replacer'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  base: process.env.BASE ?? '/',
  build: {
    rollupOptions: {
      external: ['shiki']
    }
  },
  esbuild: {
    target: 'es2019'
  },
  plugins: [
    replacer({
      exclude: [/.s?css$/],
      define: {
        __WORKSPACE_DIR__: path.resolve(__dirname, '..')
      }
    }),
    unbundledReexport(),
    tsconfigPaths()
  ]
})
