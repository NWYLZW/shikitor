import type { OffsetOrPosition, ResolvedPosition } from '@shikijs/core'

import type { ResolvedTextRange, TextRange } from '../base'

export interface RawTextHelper {
  resolvePosition(oop: OffsetOrPosition): ResolvedPosition
  resolveTextRange(tr: TextRange): ResolvedTextRange
  at(oop: OffsetOrPosition): string
  line(oop: OffsetOrPosition): string
  lineStart(oop: OffsetOrPosition): number
  lineEnd(oop: OffsetOrPosition): number
  countLeadingSpaces(oop: OffsetOrPosition, tabSize: number): number
}

export function getRawTextHelper(text: string): RawTextHelper {
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
  return {
    resolvePosition(oop) {
      return {
        offset: typeof oop === 'number'
          ? oop
          : getOffset(oop.line, oop.character),
        ...(typeof oop === 'number' ? getPosition(oop) : oop)
      }
    },
    resolveTextRange(tr) {
      return {
        start: this.resolvePosition(tr.start), end: this.resolvePosition(tr.end)
      }
    },
    at(oop) {
      return text[typeof oop === 'number' ? oop : getOffset(oop.line, oop.character)]
    },
    lineStart(oop) {
      let offset = typeof oop === 'number' ? oop : getOffset(oop.line, oop.character)
      while (offset > 0 && text[offset - 1] !== '\n') {
        offset--
      }
      return offset
    },
    lineEnd(oop) {
      let offset = typeof oop === 'number' ? oop : getOffset(oop.line, oop.character)
      while (offset < text.length && text[offset] !== '\n' && text[offset] !== '\r') {
        offset++
      }
      return offset
    },
    line(oop) {
      return text.slice(this.lineStart(oop), this.lineEnd(oop))
    },
    countLeadingSpaces(oop, tabSize) {
      const offset = typeof oop === 'number' ? oop : getOffset(oop.line, oop.character)
      let count = 0
      for (let i = offset; i < text.length; i++) {
        if (text[i] === ' ') {
          count++
        } else if (text[i] === '\t') {
          count += tabSize
        } else {
          break
        }
      }
      return count
    }
  }
}
