import swc from '@vitejs/plugin-react-swc'
import { defineConfig, type Plugin } from 'vite'

export default defineConfig({
  base: process.env.BASE ?? '/',
  esbuild: false,
  build: {
    rollupOptions: {
      external: ['shiki']
    }
  },
  plugins: [
    importmapGenerator(),
    swc()
  ]
})

function importmapGenerator(): Plugin {
  return {
    name: 'importmap-generator',
    configResolved(config) {
      const { external = [] } = config.build.rollupOptions
      for (const packageName of external as string[]) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const packageJson = require(`${packageName}/package.json`)
        console.log(packageJson)
      }
    }
  }
}
