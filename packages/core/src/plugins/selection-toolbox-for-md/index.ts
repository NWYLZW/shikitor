import { definePlugin } from '@shikitor/core'

import { formatTool, headingSelectTool, linkTool, listFormatTool, NoToolsError, quoteTool } from './tools'

export default () =>
  definePlugin({
    name: 'selection-toolbox-for-md',
    async install() {
      const dependDefer = Promise.withResolvers<void>()
      const dependDispose = this.depend(['provide-selection-toolbox'], shikitor => {
        const disposable = shikitor.registerSelectionToolsProvider('markdown', {
          provideSelectionTools(selectionText, selection) {
            const { rawTextHelper: { line, lineStart } } = shikitor
            const lineText = line(selection.start)
            if (lineText.startsWith('[//]: # (')) return

            try {
              return {
                tools: [
                  headingSelectTool(shikitor, selectionText, selection, lineText, lineStart(selection.start)),
                  formatTool('**', '**', shikitor, selectionText, selection, {
                    icon: 'format_bold'
                  }),
                  formatTool('<u>', '</u>', shikitor, selectionText, selection, {
                    icon: 'format_italic'
                  }),
                  formatTool('~~', '~~', shikitor, selectionText, selection, {
                    icon: 'format_strikethrough'
                  }),
                  formatTool('__', '__', shikitor, selectionText, selection, {
                    icon: 'format_underlined'
                  }),
                  formatTool('`', '`', shikitor, selectionText, selection, {
                    icon: 'code'
                  }),
                  linkTool(shikitor, selectionText, selection),
                  quoteTool(shikitor, selection),
                  listFormatTool(shikitor, selectionText, selection)
                ]
              }
            } catch (e) {
              if (e === NoToolsError) return
              throw e
            }
          }
        })
        dependDefer.resolve()
        return {
          dispose() {
            disposable.dispose?.()
          }
        }
      })
      await dependDefer.promise
      return {
        dispose() {
          dependDispose.dispose?.()
        }
      }
    }
  })
