import { definePlugin } from '../../core/plugin'
import { indent } from './dent'

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
    if (e.shiftKey) {
    } else {
      const { replacement, selection, selectionMode } = indent(
        value,
        [selectionStart, selectionEnd],
        { tabSize, insertSpaces }
      )
      textarea.setRangeText(replacement, ...selection, selectionMode)
      textarea.dispatchEvent(new Event('input'))
    }
  }
})
