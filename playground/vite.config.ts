import unbundledReexport from 'rollup-plugin-unbundled-reexport'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  base: process.env.BASE ?? '/',
  build: {
    rollupOptions: {
      external: ['shiki']
    }
  },
  plugins: [
    unbundledReexport(),
    tsconfigPaths()
  ]
})
