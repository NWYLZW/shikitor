import type { ShikitorOptions } from './editor'
import bracketMatcher from './plugins/bracket-matcher'

const defaultCode = `
console.log("Hello, World!")

function add(a, b) {
  return a + b
}
`.trimStart()

export default {
  value: defaultCode,
  language: 'javascript',
  theme: 'github-dark',
  plugins: [bracketMatcher]
} as ShikitorOptions
