import type { ResolvedPosition } from '@shikijs/core'

import type { ShikitorOptions } from './core/editor'
import bracketMatcher from './plugins/bracket-matcher'
import codeStyler from './plugins/code-styler'
import { unzipStr, zipStr } from './utils'

const DEFAULT_CODE = `
console.log("Hello, World!")

function add(a, b) {
  return a + b
}
`.trimStart()

let code = DEFAULT_CODE
let cursor: undefined | ResolvedPosition

const [type, content] = location.hash.slice(1).split('/')
if (content === undefined) {
  // undefined behavior, reset hash to empty
  // and don't jump page
  location.hash = ''
}
switch (type) {
  case 'zip-code':
    try {
      code = unzipStr(content)
    } catch (e) {
      console.error(e)
    }
    break
  case 'code':
    code = decodeURIComponent(content)
    break
  case 'base64':
    code = atob(content)
    break
  case 'gist':
    break
}

export default {
  get value() {
    return code
  },
  set value(value) {
    code = value
  },
  onChange(value) {
    code = value
  },
  get cursor() {
    return cursor
  },
  onCursorChange(newCursor) {
    cursor = newCursor
  },
  language: 'javascript',
  theme: 'github-dark',
  plugins: [
    bracketMatcher,
    codeStyler,
    {
      name: 'shikitor-saver',
      onKeydown(e) {
        if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault()
          if (code === DEFAULT_CODE) return

          const zipCode = zipStr(code)
          const url = new URL(location.href)
          url.hash = `zip-code/${zipCode}`
          history.pushState(null, '', url.toString())
        }
      }
    }
  ]
} as ShikitorOptions
