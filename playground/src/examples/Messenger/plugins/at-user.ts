import { definePlugin } from '@shikitor/core'

export interface AtUserOptions {
  targets: string[]
}

export default function atUser(options: AtUserOptions) {
  return definePlugin({
    name: 'at-user',
    install() {
      return this.depend(['provide-completions'], shikitor => {
        shikitor.registerCompletionItemProvider('markdown', {
          triggerCharacters: ['@'],
          provideCompletionItems(rawTextHelper, position) {
            return {
              suggestions: options.targets.map(target => ({
                label: target,
                range: { start: position.offset - 1, end: position.offset - 1 },
                insertText: `@${target}`
              }))
            }
          }
        })
      })
    }
  })
}
