import { definePlugin } from '@shikitor/core'
import type {} from '@shikitor/core/plugins/provide-completions'
import { CompletionItemKind } from '@shikitor/core/plugins/provide-completions'

export default definePlugin({
  name: 'expression-quick-completions',
  install() {
    const dependDisposable = this.depend(
      ['provide-completions'],
      shikitor =>
        shikitor.registerCompletionItemProvider('*', {
          triggerCharacters: ['.'],
          provideCompletionItems({ value, lineStart }, position) {
            const prevChar = value.charAt(position.offset - 2)
            const editorHelperTriggerReg = /[\w\d?_()[\]'"`]/
            if (!editorHelperTriggerReg.test(prevChar)) return

            let expressionStart = position.offset - 1
            // find the start of the line view width start
            while (
              expressionStart > 0 && ![
                ' ',
                '\t',
                '\r',
                '\n'
              ].includes(value[expressionStart - 1])
            ) expressionStart--
            const range = {
              start: expressionStart,
              end: position.offset - 1
            }
            const expressionStr = value.slice(range.start, range.end)
            return {
              suggestions: [
                {
                  kind: CompletionItemKind.Operator,
                  label: 'par',
                  detail: '(expr)',
                  range,
                  insertText: `(${expressionStr})`
                },
                {
                  kind: CompletionItemKind.Operator,
                  label: 'not',
                  detail: '!expr',
                  range,
                  insertText: `!${expressionStr}`
                }
              ]
            }
          }
        })
    )
    return {
      dispose() {
        dependDisposable.dispose?.()
      }
    }
  }
})
