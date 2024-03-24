import swc from '@vitejs/plugin-react-swc'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'istanbul',
      reporter: [
        'html',
        'json',
        'json-summary'
      ]
    },
    include: ['**/tests/**/*.spec.ts'],
    typecheck: {
      include: ['**/tests/**/*.spec.ts']
    }
  },
  esbuild: false,
  plugins: [
    tsconfigPaths(),
    swc()
  ]
})
