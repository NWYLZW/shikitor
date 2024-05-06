import type { ResolvedSelection } from '../../editor'
import { definePlugin } from '../../plugin'
import type { RawTextHelper } from '../../utils/getRawTextHelper'
import { isMultipleKey } from '../../utils/isMultipleKey'
import { indent, outdent } from './dent'

interface CodeStylerOptions {
  tabSize?: number
  insertSpaces?: boolean
}

const prevBracketMapping: Record<string, string> = {
  '(': ')',
  '[': ']',
  '{': '}',
  '<': '>'
}
const nextBracketMapping: Record<string, string> = {
  ')': '(',
  ']': '[',
  '}': '{',
  '>': '<'
}

function isPrevBracketKey(key: string) {
  return key in prevBracketMapping
}
function isNextBracketKey(key: string) {
  return key in nextBracketMapping
}

function dentSelection(selection: ResolvedSelection, {
  codeStyler: {
    tabSize, insertSpaces
  },
  direction,
  textarea,
  value,
  rawTextHelper,
  updateSelection
}: {
  codeStyler: CodeStylerOptions
  direction: boolean
  textarea: HTMLTextAreaElement
  value: string
  rawTextHelper: RawTextHelper
  updateSelection?: (start: number, end: number) => void
}) {
  const caller = direction ? indent : outdent
  try {
    const { replacement, range, selection: [start, end], selectionMode } = caller(
      value,
      [selection.start.offset, selection.end.offset],
      { tabSize, insertSpaces },
      rawTextHelper
    )
    textarea.setRangeText(replacement, ...range, selectionMode)
    textarea.dispatchEvent(new Event('input'))
    updateSelection?.(start, end)
  } catch (e) {
    const error = e as any
    if ('message' in error && error.message !== 'No outdent') {
      throw e
    }
  }
}

export default ({
  tabSize: inputTabSize = 2,
  insertSpaces = true
}: CodeStylerOptions = {}) => definePlugin({
  name: 'shikitor-code-styler',
  async onKeydown(e) {
    if (inputTabSize < 1) return
    const tabSize = ~~inputTabSize
    const textarea = e.target
    const [selection] = this.selections
    if (selection.start.offset === selection.end.offset) {
      if (isPrevBracketKey(e.key) && !(e.metaKey || e.ctrlKey)) {
        const { value, selections: [prevSelection] } = this
        const cursor = prevSelection.end.offset
        const char = e.key
        const bracket = prevBracketMapping[char]
        const nextChar = value[cursor]
        if (nextChar !== bracket) {
          e.preventDefault()
          textarea.setRangeText(char + bracket, cursor, cursor)
          textarea.dispatchEvent(new Event('input'))
          this.updateSelection(0, { start: cursor + 1, end: cursor + 1 })
          return
        }
      }
      if (isNextBracketKey(e.key) && !(e.metaKey || e.ctrlKey)) {
        const { value, selections: [selection] } = this
        const nextCharIndex = selection.end.offset
        if (nextCharIndex > value.length) return

        const nextChar = value[nextCharIndex]
        if (nextChar === e.key) {
          e.preventDefault()
          // TODO ```
          //      >
          //      | // cursor
          //      ```
          //      insert `>` at the cursor
          //      use stack
          this.updateSelection(0, { start: nextCharIndex + 1, end: nextCharIndex + 1 })
        }
      }
    }
    if (['Tab', 'Enter'].includes(e.key) && !isMultipleKey(e)) {
      const { selections: [selection] } = this
      if (e.key === 'Enter') {
        // TODO make timeout configurable for this plugin?
        await new Promise(resolve => setTimeout(resolve, 0))
        if (e.defaultPrevented) return
        selection.start = {
          offset: selection.start.offset + 1,
          line: selection.start.line + 1,
          character: 1
        }
        selection.end = selection.start
      }
      e.preventDefault()

      const { value, rawTextHelper } = this
      dentSelection(selection, {
        codeStyler: { tabSize, insertSpaces },
        direction: !e.shiftKey,
        textarea,
        value,
        rawTextHelper,
        updateSelection: (start, end) => this.updateSelection(0, { start, end })
      })
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
