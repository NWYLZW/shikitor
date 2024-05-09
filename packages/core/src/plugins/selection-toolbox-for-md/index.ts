import { definePlugin } from '../../plugin'
import type {} from '../provide-selection-toolbox'

export default () =>
  definePlugin({
    name: 'selection-toolbox-for-md',
    async install() {
      const dependDefer = Promise.withResolvers<void>()
      const dependDispose = this.depend(['provide-selection-toolbox'], shikitor => {
        shikitor.registerSelectionToolsProvider('markdown', {
          provideSelectionTools(selection) {
            console.log('selection', selection)
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
                {
                  type: 'button',
                  icon: 'format_bold'
                },
                {
                  type: 'button',
                  icon: 'format_italic'
                },
                {
                  type: 'button',
                  icon: 'format_strikethrough'
                },
                {
                  type: 'button',
                  icon: 'format_underlined'
                },
                {
                  type: 'button',
                  icon: 'code'
                },
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
      })
      await dependDefer.promise
      return {
        dispose() {
          dependDispose.dispose?.()
        }
      }
    }
  })
