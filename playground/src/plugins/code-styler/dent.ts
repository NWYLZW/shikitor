export interface DentOptions {
  /**
   * Number of spaces to insert when pressing the Tab key.
   */
  tabSize?: number
  /**
   * Whether to insert spaces when pressing the Tab key.
   */
  insertSpaces?: boolean
}

interface ReplacementRangeText {
  replacement: string
  range: [start: number, end: number]
  selection: [start: number, end: number]
  selectionMode?: SelectionMode
}

export function indent(
  text: string,
  selection: [start: number, end?: number],
  options: DentOptions = {}
): ReplacementRangeText {
  const [start, end = start] = selection
  const {
    tabSize = 2,
    insertSpaces = true
  } = options
  const valueLength = text.length

  const lineStart = getLineStart(text, start)
  const lineEnd = getLineEnd(text, end)

  const startAtLineStart = start === 0 || text[start - 1] === '\n'
  const endAtLineEnd = end === valueLength || text[end] === '\n' || text[end] === '\r'
  const selectBothEnds = start !== end && startAtLineStart && endAtLineEnd

  const item = insertSpaces
    ? ' '.repeat(tabSize)
    : '\t'
  const insertStrItemLength = item.length

  let replacement: string
  let range: [number, number]
  let selectionMode: SelectionMode
  let padding = insertStrItemLength
  if (selectBothEnds || start !== end) {
    replacement = text
      .slice(lineStart, lineEnd)
      .replaceAll(/^[ \t]*/gm, (leading, offset, str) => {
        if (str[offset] === '\n' || str[offset] === '\r' || offset === lineEnd) return leading

        const tabCount = 1 + ~~(countLeadingSpaces(leading, 0, tabSize) / tabSize)
        return item.repeat(tabCount)
      })
    range = [lineStart, lineEnd]
    selectionMode = 'select'
  } else {
    replacement = '\t'
    range = [start, end]
    selectionMode = 'end'
    if (insertSpaces) {
      padding = tabSize - ((start - lineStart) % tabSize)
      replacement = ' '.repeat(padding)
    }
  }

  const firstLine = getLine(text, start)
  const firstLineForReplacement = getLine(replacement, 0)
  let firstLineInsertCharCount
  if (selectionMode === 'select') {
    firstLineInsertCharCount = firstLineForReplacement.length - firstLine.length
  } else {
    firstLineInsertCharCount = padding
  }
  const originalLength = range[1] - range[0]
  const newLength = replacement.length
  const insertCharCount = newLength - originalLength
  const newSelection = [
    start + firstLineInsertCharCount,
    end + insertCharCount
  ] as [number, number]
  return {
    replacement, range,
    selection: newSelection,
    selectionMode
  }
}

function getLineStart(value: string, index: number) {
  while (index > 0 && value[index - 1] !== '\n') {
    index--
  }
  return index
}

function getLineEnd(value: string, index: number) {
  if (index > 0 && value[index - 1] === '\n') {
    return index - 1
  }

  while (index < value.length && value[index] !== '\n' && value[index] !== '\r') {
    index++
  }
  return index
}

function getLine(value: string, index: number) {
  let i = index
  while (i > 0 && value[i - 1] !== '\n') {
    i--
  }
  const left = i
  while (i < value.length && value[i] !== '\n') {
    i++
  }
  const right = i
  return value.slice(left, right)
}

function isMultiLine(value: string, start: number, end: number) {
  for (let i = start; i < end; i++) {
    if (value[i] === '\n') {
      return true
    }
  }
  return false
}

function countLeadingSpaces(value: string, start: number, tabSize: number) {
  let count = 0
  for (let i = start; i < value.length; i++) {
    if (value[i] === ' ') {
      count++
    } else if (value[i] === '\t') {
      count += tabSize
    } else {
      break
    }
  }

  return count
}
