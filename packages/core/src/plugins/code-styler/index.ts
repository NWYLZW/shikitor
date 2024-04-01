import { definePlugin } from '../../plugin'
import { indent, outdent } from './dent'

interface CodeStylerOptions {
  tabSize?: number
  insertSpaces?: boolean
}
export default ({
  tabSize: inputTabSize = 2,
  insertSpaces = true
}: CodeStylerOptions = {}) => definePlugin({
  name: 'shikitor-code-styler',
  onKeydown(e) {
    if (inputTabSize < 1) return
    const tabSize = ~~inputTabSize
    if (e.key === 'Tab') {
      e.preventDefault()

      const textarea = e.target
      const { selectionStart, selectionEnd, value } = textarea
      const caller = e.shiftKey ? outdent : indent
      try {
        const { replacement, range, selection, selectionMode } = caller(
          value,
          [selectionStart, selectionEnd],
          { tabSize, insertSpaces }
        )
        textarea.setRangeText(replacement, ...range, selectionMode)
        textarea.setSelectionRange(...selection)
        textarea.dispatchEvent(new Event('input'))
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
