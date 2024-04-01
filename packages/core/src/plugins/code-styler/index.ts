import { definePlugin } from '../../plugin'
import { indent, outdent } from './dent'

interface CodeStylerOptions {
  tabSize?: number
  insertSpaces?: boolean
}

function isBracketKey(key: string) {
  return key === '{' || key === '[' || key === '(' || key === '<'
}

export default ({
  tabSize: inputTabSize = 2,
  insertSpaces = true
}: CodeStylerOptions = {}) => definePlugin({
  name: 'shikitor-code-styler',
  async onKeydown(e) {
    if (inputTabSize < 1) return
    const tabSize = ~~inputTabSize
    if (isBracketKey(e.key) && !(e.metaKey || e.ctrlKey)) {
      // TODO auto close bracket
    }
    if (e.key === 'Tab' || e.key === 'Enter') {
      e.key === 'Tab' && e.preventDefault()
      if (e.key === 'Enter') {
        await new Promise(r => setTimeout(r, 20))
      }

      const { value, rawTextHelper, selections: [prevSelection] } = this
      const textarea = e.target
      const caller = e.shiftKey ? outdent : indent
      try {
        const { replacement, range, selection: [start, end], selectionMode } = caller(
          value,
          [prevSelection.start.offset, prevSelection.end.offset],
          { tabSize, insertSpaces },
          rawTextHelper
        )
        textarea.setRangeText(replacement, ...range, selectionMode)
        textarea.dispatchEvent(new Event('input'))
        this.updateSelection(0, { start, end })
      } catch (e) {
        const error = e as any
        if ('message' in error && error.message !== 'No outdent') {
          throw e
        }
      }
    }
    if (e.key === 'ArrowLeft' && (e.ctrlKey || e.metaKey)) {
      const { value, rawTextHelper, selections: [{ end }] } = this
      const [
        lineStart, lineEnd
      ] = [
        rawTextHelper.lineStart(end.offset),
        rawTextHelper.lineEnd(end.offset)
      ]
      const line = value.slice(lineStart, lineEnd)
      const indent = line.match(/^\s+/)?.[0] ?? ''
      // ```ts
      //   const a = 1
      // 1234
      // ```
      // 0 => 2
      // 1 => 0
      // 2 => 0
      // 3 => 2
      // 4 => 2
      const cursorT0 = lineStart + indent.length
      if (cursorT0 !== end.offset) {
        e.preventDefault()
        if (!e.shiftKey) {
          this.focus(cursorT0)
        } else {
          this.updateSelection(0, { start: cursorT0, end: end.offset })
        }
        return
      }
    }
  }
})
