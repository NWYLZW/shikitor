import { definePlugin } from '@shikitor/core'

export interface AtUserOptions {
  targets: string[]
}

export default function atUser(options: AtUserOptions) {
  return definePlugin({
    name: 'at-user',
    async install() {
      const installedDefer = Promise.withResolvers<void>()
      const disposeDepend = this.depend(['provide-completions'], shikitor => {
        shikitor.registerCompletionItemProvider('markdown', {
          triggerCharacters: ['@'],
          provideCompletionItems(rawTextHelper, position) {
            console.log(position)
            return {
              suggestions: options.targets.map(target => ({
                label: target,
                range: { start: position.offset - 1, end: position.offset - 1 },
                insertText: `@${target}`
              }))
            }
          }
        })
        installedDefer.resolve()
      }).dispose
      await installedDefer.promise
      return {
        dispose() {
          disposeDepend?.()
        }
      }
    }
  })
}
