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
  plugins: [
    tsconfigPaths()
  ]
})
