import type { ResolvedTextRange, Shikitor } from '@shikitor/core'

import { definePlugin } from '../../plugin'
import type { ToolInner } from '../provide-selection-toolbox'

const boldTool = (
  shikitor: Shikitor,
  selectionText: string,
  range: ResolvedTextRange
) => {
  const { start, end } = range
  const value = shikitor.value
  const startOffset = Math.max(
    start.offset - 2,
    Math.max(
      start.offset - 1,
      1
    )
  ) - 1
  const endOffset = Math.min(
    end.offset + 2,
    Math.min(
      end.offset + 1,
      value.length
    )
  )
  let activated = false
  let textStart = -1
  let textEnd = -1
  for (let i = startOffset; i < endOffset; i++) {
    if (value[i] === '*' && value[i + 1] === '*') {
      if (textStart === -1) {
        textStart = i + 2
        i += 2
        continue
      }
      textEnd = i
      activated = true
      break
    }
  }
  const text = activated
    ? value.slice(textStart, textEnd)
    : selectionText
  return {
    type: 'toggle',
    activated,
    icon: 'format_bold',
    onToggle() {
      if (!activated) {
        shikitor.setRangeText(range, `**${text}**`)
        shikitor.updateSelection(0, {
          start: range.start.offset + 2,
          end: range.end.offset + 2
        })
      } else {
        shikitor.setRangeText({
          start: textStart - 2,
          end: textEnd + 2
        }, text)
        shikitor.updateSelection(0, {
          start: textStart - 2,
          end: textEnd - 2
        })
      }
    }
  } satisfies ToolInner
}

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
                boldTool(shikitor, selectionText, selection),
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
