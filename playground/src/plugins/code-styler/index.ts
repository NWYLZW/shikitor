import { definePlugin } from '../../core/plugin'
import { indent, outdent } from './dent'

interface CodeStylerOptions {
  tabSize?: number
  insertSpaces?: boolean
}
export default ({
  tabSize = 2,
  insertSpaces = true
}: CodeStylerOptions = {}) => definePlugin({
  name: 'shikitor-code-styler',
  onKeydown(e) {
    if (e.key !== 'Tab') return
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
})
