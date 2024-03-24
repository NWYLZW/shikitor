import * as process from 'process'
import { defineConfig } from 'vite'

export default defineConfig({
  base: process.env.BASE ?? '/'
})
