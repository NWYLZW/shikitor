import type { OffsetOrPosition, ResolvedPosition } from '@shikijs/core'

import type { ResolvedTextRange, TextRange } from '../base'

export interface RawTextHelper {
  resolvePosition(oop: OffsetOrPosition, text?: string): ResolvedPosition
  resolveTextRange(tr: TextRange, text?: string): ResolvedTextRange
  at(oop: OffsetOrPosition, text?: string): string
  line(oop: OffsetOrPosition, text?: string): string
  lineStart(oop: OffsetOrPosition, text?: string): number
  lineEnd(oop: OffsetOrPosition, text?: string): number
  countLeadingSpaces(oop: OffsetOrPosition, tabSize: number, text?: string): number
  inferLineLeadingSpaces(oop: OffsetOrPosition, tabSize: number, text?: string): number
}

export function getRawTextHelper(originalText: string): RawTextHelper {
  function getOffset(line: number, character: number, text: string) {
    const lines = text.split('\n')
    return lines.slice(0, line - 1).reduce((acc, line) => acc + line.length + 1, 0) + character
  }
  function getPosition(offset: number, text: string) {
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
  const rawTextHelper: RawTextHelper = {
    resolvePosition(oop, text = originalText) {
      return {
        offset: typeof oop === 'number'
          ? oop
          : getOffset(oop.line, oop.character, text),
        ...(typeof oop === 'number' ? getPosition(oop, text) : oop)
      }
    },
    resolveTextRange(tr, text = originalText) {
      return {
        start: rawTextHelper.resolvePosition(tr.start, text), end: rawTextHelper.resolvePosition(tr.end, text)
      }
    },
    at(oop, text = originalText) {
      return text[typeof oop === 'number' ? oop : getOffset(oop.line, oop.character, text)]
    },
    lineStart(oop, text = originalText) {
      let offset = typeof oop === 'number' ? oop : getOffset(oop.line, oop.character, text)
      while (offset > 0 && text[offset - 1] !== '\n') {
        offset--
      }
      return offset
    },
    lineEnd(oop, text = originalText) {
      let offset = typeof oop === 'number' ? oop : getOffset(oop.line, oop.character, text)
      while (offset < text.length && text[offset] !== '\n' && text[offset] !== '\r') {
        offset++
      }
      return offset
    },
    line(oop, text = originalText) {
      return text.slice(rawTextHelper.lineStart(oop, text), rawTextHelper.lineEnd(oop, text))
    },
    countLeadingSpaces(oop, tabSize, text = originalText) {
      const offset = typeof oop === 'number' ? oop : getOffset(oop.line, oop.character, text)
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
    },
    inferLineLeadingSpaces(oop, tabSize, text = originalText) {
      const { line } = rawTextHelper.resolvePosition(oop, text)
      const computeLine = line === 0 ? 0 : line - 1
      const lineStart = rawTextHelper.lineStart({ line: computeLine, character: 1 }, text)
      const leadingSpaces = rawTextHelper.countLeadingSpaces(lineStart, tabSize, text)
      return leadingSpaces - leadingSpaces % tabSize
    }
  }
  return rawTextHelper
}
