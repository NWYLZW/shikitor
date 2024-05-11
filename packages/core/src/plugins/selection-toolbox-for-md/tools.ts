import type { ResolvedTextRange } from '../../base'
import type { Shikitor } from '../../editor'
import type { ToolInner } from '../provide-selection-toolbox'

export function formatTool(
  prefix: string,
  suffix: string,
  shikitor: Shikitor,
  selectionText: string,
  range: ResolvedTextRange,
  tool: Omit<ToolInner & { type?: 'toggle' }, 'type'>
) {
  const { start, end } = range
  const value = shikitor.value
  let activated = false
  let textStart = -1
  for (let i = start.offset; i >= 0; i--) {
    if (value[i] === '\n' || value[i] === '\r') break
    if (value.slice(i, i + prefix.length) === prefix) {
      textStart = i + prefix.length
      break
    }
  }
  let textEnd = -1
  if (textStart !== -1) {
    for (
      let i = Math.max(
        end.offset - suffix.length,
        start.offset
      );
      i < value.length;
      i++
    ) {
      if (value[i] === '\n' || value[i] === '\r') break
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
