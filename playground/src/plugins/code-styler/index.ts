import { definePlugin } from '../../core/plugin'

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
      const spaces = ' '.repeat(tabSize)
      const newValue = value.slice(0, selectionStart) + spaces + value.slice(selectionEnd)
      const newSelectionStart = selectionStart + spaces.length
      const newSelectionEnd = newSelectionStart
      textarea.value = newValue
      textarea.setSelectionRange(newSelectionStart, newSelectionEnd)
      textarea.dispatchEvent(new Event('input'))
    }
  }
})
