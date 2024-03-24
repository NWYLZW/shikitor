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

  if (selectBothEnds || isMultiLine(text, start, end)) {
    const replacement = text.slice(lineStart, lineEnd).replaceAll(/^[ \t]*/gm, (leading, offset, str) => {
      if (str[offset] === '\n' || str[offset] === '\r' || offset === lineEnd) return leading

      const tabCount = 1 + ~~(countLeadingSpaces(leading, 0, tabSize) / tabSize)

      if (insertSpaces) {
        return ' '.repeat(tabCount * tabSize)
      }
      return '\t'.repeat(tabCount)
    })
    return {
      replacement: replacement,
      selection: [lineStart, lineEnd],
      selectionMode: 'select'
    }
  }

  let replacement = '\t'
  if (insertSpaces) {
    const padding = tabSize - ((start - lineStart) % tabSize)
    replacement = ' '.repeat(padding)
  }

  return {
    replacement: replacement,
    selection: [start, end],
    selectionMode: 'end'
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
