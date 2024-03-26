import swc from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  base: process.env.BASE ?? '/',
  esbuild: false,
  build: {
    rollupOptions: {
      external: ['shiki']
    }
  },
  plugins: [
    swc(),
    tsconfigPaths()
  ]
})
