import { definePlugin } from '../plugin'
import type {} from './provide-completions'

export default definePlugin({
  name: 'expression-quick-completions',
  install() {
    const dependDisposable = this.depend(['provide-completions'], shikitor => shikitor.registerCompletionItemProvider('*', {
      triggerCharacters: ['.'],
      provideCompletionItems({ value, lineStart }, position) {
        const prevChar = value.charAt(position.offset - 2)
        const editorHelperTriggerReg = /[\w\d?_()[\]'"`]/
        if (!editorHelperTriggerReg.test(prevChar)) return

        let viewStart = lineStart(position.offset)
        // find the start of the line view width start
        while (viewStart > 0 && ![
          ' ',
          '\t',
          '\n'
        ].includes(value[viewStart + 1])) viewStart++
        const range = {
          start: viewStart,
          end: position.offset - 1
        }
        const lineStr = value.slice(range.start, range.end)
        return {
          suggestions: [
            {
              label: 'par',
              detail: '(expr)',
              range,
              insertText: `(${lineStr})`
            }
          ]
        }
      }
    }))
    return {
      dispose() {
        dependDisposable.dispose()
      }
    }
  }
})
