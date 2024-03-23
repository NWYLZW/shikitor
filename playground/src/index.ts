import './index.scss'

import { create } from './editor'
import bracketMatcher from './plugins/bracket-matcher'

const container = document.querySelector<HTMLDivElement>('#container')

const defaultCode = `
console.log("Hello, World!")

function add(a, b) {
  return a + b
}
`.trimStart()
if (container) {
  const shikitor = create(container, {
    value: defaultCode,
    language: 'javascript',
    theme: 'github-dark',
    plugins: [bracketMatcher]
  })
}
