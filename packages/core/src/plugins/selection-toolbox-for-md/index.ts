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
            const { rawTextHelper: { line } } = shikitor
            const lineText = line(selection.start)
            if (lineText.startsWith('[//]: # (')) return

            return {
              tools: [
                {
                  label: 'Heading',
                  type: 'select',
                  activatable: true,
                  options: [
                    { label: 'Normal', icon: 'text_fields', value: 'p', activated: true },
                    { label: 'Heading 1', icon: 'tag', value: 'h1' },
                    { label: 'Heading 2', icon: 'tag', value: 'h2' },
                    { label: 'Heading 3', icon: 'tag', value: 'h3' },
                    { label: 'Heading 4', icon: 'tag', value: 'h4' },
                    { label: 'Heading 5', icon: 'tag', value: 'h5' },
                    { label: 'Heading 6', icon: 'tag', value: 'h6' }
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
