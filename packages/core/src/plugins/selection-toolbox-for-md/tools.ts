import type { ResolvedTextRange } from '../../base'
import type { Shikitor } from '../../editor'
import type { ToolInner } from '../provide-selection-toolbox'

export function formatTool(
  prefix: string,
  suffix: string,
  shikitor: Shikitor,
  selectionText: string,
  range: ResolvedTextRange,
  tool: ToolInner
) {
  const { start, end } = range
  const value = shikitor.value
  let activated = false
  let textStart = -1
  a: for (let i = start.offset;; i--) {
    if (i - (prefix.length - 1) < 0) break

    for (let j = 0; j < prefix.length; j++) {
      if (value[i - j] === '\n' || value[i - j] === '\r') break a
    }
    if (value.slice(i - prefix.length, i) === prefix) {
      textStart = i
      break
    }
  }
  let textEnd = -1
  if (textStart !== -1) {
    a: for (let i = end.offset;; i++) {
      if (i + suffix.length > value.length) break

      for (let j = 0; j < suffix.length; j++) {
        if (value[i + j] === '\n' || value[i + j] === '\r') break a
      }
      if (value.slice(i, i + suffix.length) === suffix) {
        textEnd = i
        activated = true
        break
      }
    }
  }
  const text = activated
    ? value.slice(textStart, textEnd)
    : selectionText
  return {
    ...tool,
    type: 'toggle',
    activated,
    onToggle() {
      if (!activated) {
        shikitor.setRangeText(range, `${prefix}${text}${suffix}`)
        shikitor.updateSelection(0, {
          start: range.start.offset + prefix.length,
          end: range.end.offset + prefix.length
        })
      } else {
        shikitor.setRangeText({
          start: textStart - prefix.length,
          end: textEnd + suffix.length
        }, text)
        shikitor.updateSelection(0, {
          start: textStart - prefix.length,
          end: textEnd - prefix.length
        })
      }
    }
  } satisfies ToolInner
}
