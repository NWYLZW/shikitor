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
            const { rawTextHelper: { line, lineStart } } = shikitor
            const lineText = line(selection.start)
            if (lineText.startsWith('[//]: # (')) return

            const headingCount = (lineText.match(/^#+ /)?.[0].length ?? 1) - 1
            return {
              tools: [
                {
                  label: 'Heading',
                  type: 'select',
                  disabled: selectionText.includes('\n'),
                  activatable: true,
                  options: [
                    { label: 'Normal', icon: 'text_fields', value: 'p', activated: headingCount === 0 },
                    { label: 'Heading 1', icon: 'tag', value: 'h1', activated: headingCount === 1 },
                    { label: 'Heading 2', icon: 'tag', value: 'h2', activated: headingCount === 2 },
                    { label: 'Heading 3', icon: 'tag', value: 'h3', activated: headingCount === 3 },
                    { label: 'Heading 4', icon: 'tag', value: 'h4', activated: headingCount === 4 },
                    { label: 'Heading 5', icon: 'tag', value: 'h5', activated: headingCount === 5 },
                    { label: 'Heading 6', icon: 'tag', value: 'h6', activated: headingCount === 6 }
                  ],
                  async onSelect(value) {
                    if (!value) return
                    const startOffset = lineStart(selection.start)
                    if (value === 'p') {
                      await shikitor.setRangeText({
                        start: startOffset,
                        end: startOffset + headingCount + 1
                      }, '')
                      shikitor.updateSelection(0, {
                        start: selection.start.offset - headingCount - 1,
                        end: selection.end.offset - headingCount - 1
                      })
                    } else {
                      const repeatCount = Number(value.slice(1))
                      const crease = repeatCount - headingCount
                      await shikitor.setRangeText({
                        start: startOffset,
                        end: startOffset + headingCount + (
                          headingCount === 0 ? 0 : 1
                        )
                      }, `${'#'.repeat(repeatCount)} `)
                      shikitor.updateSelection(0, {
                        start: selection.start.offset + crease + (
                          headingCount === 0 ? 1 : 0
                        ),
                        end: selection.end.offset + crease + (
                          headingCount === 0 ? 1 : 0
                        )
                      })
                    }
                  }
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
