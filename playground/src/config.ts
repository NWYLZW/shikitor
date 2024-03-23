import type { ResolvedPosition } from '@shikijs/core'

import type { ShikitorOptions } from './core/editor'
import bracketMatcher from './plugins/bracket-matcher'

let defaultCode = `
console.log("Hello, World!")

function add(a, b) {
  return a + b
}
`.trimStart()
let cursor: undefined | ResolvedPosition

export default {
  get value() {
    return defaultCode
  },
  set value(value) {
    defaultCode = value
  },
  onChange(value) {
    defaultCode = value
  },
  get cursor() {
    console.log('Getting cursor:', cursor)
    return cursor
  },
  onCursorChange(newCursor) {
    console.log('Cursor changed:', newCursor)
    cursor = newCursor
  },
  language: 'javascript',
  theme: 'github-dark',
  plugins: [bracketMatcher]
} as ShikitorOptions
