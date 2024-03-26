import { definePlugin } from '../../core/plugin'
import { getLineEnd, getLineStart, indent, outdent } from './dent'

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
      const { value, cursor: { offset } } = this
      const [
        lineStart, lineEnd
      ] = [
        getLineStart(value, offset),
        getLineEnd(value, offset)
      ]
      const line = value.slice(lineStart, lineEnd)
      const indent = line.match(/^\s+/)?.[0]
      // ```ts
      //   const a = 1
      // 1234
      // ```
      // 0 => 2
      // 1 => 0
      // 2 => 0
      // 3 => 2
      // 4 => 2
      const cursorT0 = lineStart + (indent?.length ?? 0)
      if (cursorT0 !== offset) {
        e.preventDefault()
        this.focus(cursorT0)
        return
      }
    }
  }
})
