import { definePlugin } from '../../plugin'
import { formatTool } from './tools'

export default () =>
  definePlugin({
    name: 'selection-toolbox-for-md',
    async install() {
      const dependDefer = Promise.withResolvers<void>()
      const dependDispose = this.depend(['provide-selection-toolbox'], shikitor => {
        const disposable = shikitor.registerSelectionToolsProvider('markdown', {
          provideSelectionTools(selectionText, selection) {
            return {
              tools: [
                {
                  label: 'Heading',
                  type: 'select',
                  options: [
                    { label: 'Heading 1', value: 'h1' },
                    { label: 'Heading 2', value: 'h2' },
                    { label: 'Heading 3', value: 'h3' },
                    { label: 'Heading 4', value: 'h4' },
                    { label: 'Heading 5', value: 'h5' },
                    { label: 'Heading 6', value: 'h6' }
                  ]
                },
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
                {
                  type: 'button',
                  icon: 'link'
                },
                {
                  type: 'button',
                  icon: 'format_quote'
                },
                {
                  type: 'button',
                  icon: 'format_list_bulleted'
                },
                {
                  type: 'button',
                  icon: 'format_list_numbered'
                }
              ]
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
