import * as process from 'process'
import swc from 'rollup-plugin-swc3'
import { defineConfig } from 'vite'

export default defineConfig({
  base: process.env.BASE ?? '/',
  esbuild: false,
  plugins: [swc()]
})
