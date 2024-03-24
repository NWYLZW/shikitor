import swc from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'
import { cdn } from 'vite-plugin-cdn2'
import { unpkg } from 'vite-plugin-cdn2/resolver/unpkg'

export default defineConfig({
  base: process.env.BASE ?? '/',
  esbuild: false,
  plugins: [
    swc(),
    cdn({
      resolve: unpkg(),
      modules:[
        // use shiki wasm cdn
        // { name: 'shiki', global: 'Shiki', spare: 'dist/index.umd.js' }
      ]
    })
  ]
})
