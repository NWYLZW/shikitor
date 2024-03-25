import swc from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'

export default defineConfig({
  base: process.env.BASE ?? '/',
  esbuild: false,
  plugins: [
    swc()
  ]
})
