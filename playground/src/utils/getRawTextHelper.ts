import type { OffsetOrPosition } from '@shikijs/core'

export function getRawTextHelper(text: string) {
  function getOffset(line: number, character: number) {
    const lines = text.split('\n')
    return lines.slice(0, line - 1).reduce((acc, line) => acc + line.length + 1, 0) + character
  }
  function getPosition(offset: number) {
    const lines = text.split('\n')
    let line = 1
    let character = 1
    for (const lineContent of lines) {
      if (offset <= lineContent.length) {
        character = offset
        break
      }
      offset -= lineContent.length + 1
      line++
    }
    return { line, character }
  }
  function getResolvedPositions(oop: OffsetOrPosition) {
    return {
      offset: typeof oop === 'number'
        ? oop
        : getOffset(oop.line, oop.character),
      ...(typeof oop === 'number' ? getPosition(oop) : oop)
    }
  }
  return {
    getOffset,
    getPosition,
    getResolvedPositions
  }
}
