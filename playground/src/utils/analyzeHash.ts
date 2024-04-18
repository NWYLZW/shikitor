import { unzipStr } from './zipStr'

export const DEFAULT_CODE = `
console.log("Hello, World!")

function add(a, b) {
  return a + b
}
`.trimStart()

export function analyzeHash() {
  let code = DEFAULT_CODE
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
  return { code, type, content }
}

// // @ts-ignore
// const bundledPluginModules: Record<string, () => Promise<{
//   default: ShikitorPlugin | (() => ShikitorPlugin)
// }>> = import.meta.glob(['../../packages/core/src/plugins/*.ts', '../../packages/core/src/plugins/*/index.ts'])
// export const bundledPluginsInfo = Object
//   .entries(bundledPluginModules)
//   .map(([path, lazyModule]) => {
//     const name = path.match(/\/plugins\/(.+?)(\/index)?\.ts$/)?.[1]
//     return { id: name, name, lazyModule }
//   })
// const DEFAULT_INSTALLED_PLUGINS: (
//   () => Promise<ShikitorPlugin>
// )[] = bundledPluginsInfo
//   .filter(({ id }) => id && [
//     'bracket-matcher',
//     'code-styler',
//     'provide-completions',
//     'expression-quick-completions'
//   ].includes(id))
//   .map(({ lazyModule }) => () => lazyModule().then(({ default: plugin }) => {
//     if (typeof plugin === 'function') {
//       return plugin()
//     }
//     return plugin
//   }))
