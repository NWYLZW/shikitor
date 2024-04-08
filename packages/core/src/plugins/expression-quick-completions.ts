import { definePlugin } from '../plugin'
import type {} from './provide-completions'

export default definePlugin({
  name: 'expression-quick-completions',
  install() {
    const dependDisposable = this.depend(['provide-completions'], shikitor => shikitor.registerCompletionItemProvider('*', {
      triggerCharacters: ['.'],
      provideCompletionItems({ value }, position) {
        const prevChar = value.charAt(position.offset - 2)
        const editorHelperTriggerReg = /[\w\d?_()[\]'"`]/
        if (!editorHelperTriggerReg.test(prevChar)) return

        return {
          suggestions: [
            {
              label: 'par',
              detail: '(expr)'
            },
            {
              label: 'var',
              detail: 'var name = expr'
            },
            {
              label: 'let',
              detail: 'let name = expr'
            },
            {
              label: 'const',
              detail: 'const name = expr'
            },
            {
              label: 'return',
              detail: 'return expr'
            },
            {
              label: 'throw',
              detail: 'throw expr'
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
