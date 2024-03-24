import type { ResolvedPosition } from '@shikijs/core'

import type { ShikitorOptions } from './core/editor'
import type { ShikitorPlugin } from './core/plugin'
import bracketMatcher from './plugins/bracket-matcher'
import codeStyler from './plugins/code-styler'
import { unzipStr } from './utils/zipStr'

export const DEFAULT_CODE = `
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
}

export const hashType = type
export const hashContent = content

interface QueryOptions {
  language?: string
  theme?: string
}

const query = new URLSearchParams(location.search)
const queryOptions: QueryOptions = {
  language: 'javascript',
  theme: 'github-dark'
}
if (query.has('language')) {
  queryOptions.language = query.get('language')!
}
if (query.has('theme')) {
  queryOptions.theme = query.get('theme')!
}

// @ts-ignore
const bundledPluginModules: Record<string, () => Promise<{
  default: ShikitorPlugin | (() => ShikitorPlugin)
}>> = import.meta.glob(['./plugins/*.ts', './plugins/*/index.ts'])
export const bundledPluginsInfo = Object
  .entries(bundledPluginModules)
  .map(([path, module]) => {
    const name = path.match(/\.\/plugins\/(.+?)(\/index)?\.ts$/)?.[1]
    return { id: name, name, module }
  })

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
  ...queryOptions,
  plugins: [
    bracketMatcher,
    codeStyler
  ]
} as ShikitorOptions
