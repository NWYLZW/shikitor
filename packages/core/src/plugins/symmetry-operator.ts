import { definePlugin } from '@shikitor/core'

const symmetryOperatorMapping: Record<string, string> = {
  '(': ')',
  '[': ']',
  '{': '}',
  '<': '>',
  '`': '`',
  '\'': '\'',
  '"': '"'
}
function isSymmetryOperatorKey(key: string) {
  return key in symmetryOperatorMapping
}
const name = 'symmetry-operator'
export default () => {
  return definePlugin({
    name,
    onKeydown(e) {
      const textarea = e.target
      const [{ start, end }] = this.selections
      if (start.offset === end.offset) return
      if (isSymmetryOperatorKey(e.key) && !(e.metaKey || e.ctrlKey)) {
        textarea.setRangeText(symmetryOperatorMapping[e.key], end.offset, end.offset)
        textarea.setRangeText(e.key, start.offset, start.offset)
        textarea.dispatchEvent(new Event('input'))
        this.updateSelection(0, { start: end.offset + 2, end: end.offset + 2 })
      }
      e.preventDefault()
    }
  })
}
