import type { ResolvedTextRange } from '../../base'
import type { Shikitor } from '../../editor'
import type { ToolInner } from '../provide-selection-toolbox'

export const NoToolsError = new Error('No tools provided')

export function headingSelectTool(
  shikitor: Shikitor,
  selectionText: string,
  selection: ResolvedTextRange,
  lineText: string,
  lineStartOffset: number
): ToolInner & { type?: 'select' } {
  const headingCount = (lineText.match(/^#+ /)?.[0].length ?? 1) - 1
  return {
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
      if (value === 'p') {
        await shikitor.setRangeText({
          start: lineStartOffset,
          end: lineStartOffset + headingCount + 1
        }, '')
        shikitor.updateSelection(0, {
          start: selection.start.offset - headingCount - 1,
          end: selection.end.offset - headingCount - 1
        })
      } else {
        const repeatCount = Number(value.slice(1))
        const crease = repeatCount - headingCount
        await shikitor.setRangeText({
          start: lineStartOffset,
          end: lineStartOffset + headingCount + (
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
  }
}

export function quoteTool(
  shikitor: Shikitor,
  range: ResolvedTextRange
) {
  const lines = [] as [number, string][]
  for (let line = range.start.line; line <= range.end.line; line++) {
    lines.push([
      line,
      shikitor.rawTextHelper.line({
        line,
        character: 1
      })
    ])
  }
  // when all lines are quoted, unquote them
  const activated = lines.every(([, text]) => text.startsWith('> '))
  return {
    type: 'toggle',
    activated,
    icon: 'format_quote',
    async onToggle() {
      if (activated) {
        for await (const [line, text] of lines) {
          await shikitor.setRangeText(
            shikitor.rawTextHelper.resolveTextRange({
              start: { line, character: 0 },
              end: { line, character: text.length }
            }),
            text.slice(2)
          )
        }
        shikitor.updateSelection(0, {
          start: range.start.offset - 2,
          end: range.end.offset - lines.length * 2
        })
      } else {
        for await (const [line, text] of lines) {
          await shikitor.setRangeText(
            shikitor.rawTextHelper.resolveTextRange({
              start: { line, character: 0 },
              end: { line, character: text.length }
            }),
            `> ${text}`
          )
        }
        shikitor.updateSelection(0, {
          start: range.start.offset + 2,
          end: range.end.offset + lines.length * 2
        })
      }
    }
  } satisfies ToolInner
}

export function linkTool(
  shikitor: Shikitor,
  selectionText: string,
  range: ResolvedTextRange
) {
  const { start, end } = range
  const value = shikitor.value
  let activated = false
  let textStart = -1
  for (let i = start.offset; i >= 0; i--) {
    if (value[i] === '\n' || value[i] === '\r') break
    if (value[i] === '[') {
      textStart = i + 1
      break
    }
  }
  let textEnd = -1
  let linkEnd = -1
  if (textStart !== -1) {
    a: for (
      let i = textStart;
      i < value.length;
      i++
    ) {
      if (value[i] === '\n' || value[i] === '\r') break
      if (value.slice(i, i + ']('.length) === '](') {
        textEnd = i
        for (let j = i + 2; j < value.length; j++) {
          if (value[j] === '\n' || value[j] === '\r') break
          if (value[j] === ')') {
            linkEnd = j
            activated = true
            break a
          }
        }
      }
    }
  }
  // [a](bcd)
  //    ^^^^^
  // don't support tools in this case
  if (activated && start.offset >= textEnd && end.offset <= linkEnd) {
    throw NoToolsError
  }

  const text = activated
    ? value.slice(textStart, textEnd)
    : selectionText
  return {
    type: 'toggle',
    activated,
    icon: 'link',
    async onToggle() {
      if (!activated) {
        await shikitor.setRangeText(range, `[${text}]()`)
        shikitor.updateSelection(0, {
          start: range.start.offset + 1,
          end: range.end.offset + 1
        })
      } else {
        await shikitor.setRangeText({
          start: textStart - 1,
          end: linkEnd + 1
        }, text)
        shikitor.updateSelection(0, {
          start: textStart - 1,
          end: textEnd - 1
        })
      }
    }
  } satisfies ToolInner
}

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
