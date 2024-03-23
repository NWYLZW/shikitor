import type { DecorationItem } from '@shikijs/core'

export function throttle<T extends (...args: any[]) => void>(fn: T, delay: number) {
  let last = 0
  return (...args: any[]) => {
    const now = Date.now()
    if (now - last >= delay) {
      fn(...args)
      last = now
    }
  }
}

export function getRawTextHelper(text: string) {
  return {
    getOffset: (line: number, character: number) => {
      const lines = text.split('\n')
      return lines.slice(0, line - 1).reduce((acc, line) => acc + line.length + 1, 0) + character
    },
    getPosition: (offset: number) => {
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
  }
}

export function decorateTokens(
  rawText: string,
  tokensLines: {
    content: string
    offset: number
    color: string
    fontStyle: number
    tagName?: string
  }[][],
  decorations: Pick<DecorationItem, 'start' | 'end' | 'tagName'>[]
) {
  const { getOffset, getPosition } = getRawTextHelper(rawText)
  const result = tokensLines
  for (const { start, end, tagName } of decorations) {
    const startOffset = typeof start === 'number'
      ? start
      : getOffset(start.line, start.character)
    const endOffset = typeof end === 'number'
      ? end
      : getOffset(end.line, end.character)
    const startPosition = typeof start === 'number'
      ? getPosition(start)
      : start
    const endPosition = typeof end === 'number'
      ? getPosition(end)
      : end
    const tokens = tokensLines[startPosition.line - 1]
    if (!tokens) {
      continue
    }
    const newTokensLine: typeof tokens = []
    for (const token of tokens) {
      const tokenStart = token.offset
      const tokenEnd = token.offset + token.content.length
      // --123--
      // ^^
      if (endOffset <= tokenStart) {
        newTokensLine.push(token)
      }
      // --123--
      //      ^^
      if (tokenEnd <= startOffset) {
        newTokensLine.push(token)
      }
      // --123--
      //  ^^^
      // --123--
      //  ^^^^
      // --123--
      //  ^^^^^
      // --123--
      //   ^^^^
      // --123--
      //    ^^^
      const l = startOffset > tokenStart
        ? startOffset - tokenStart
        : 0
      const r = endOffset < tokenEnd
        ? endOffset - tokenStart
        : token.content.length
      if (l < r) {
        const content = r === token.content.length
          ? token.content.slice(l)
          : token.content.slice(l, r)
        if (l !== 0) {
          newTokensLine.push({
            ...token,
            content: token.content.slice(0, l)
          })
        }
        newTokensLine.push({
          ...token,
          content,
          offset: token.offset + l,
          tagName
        })
        if (r !== token.content.length) {
          newTokensLine.push({
            ...token,
            content: token.content.slice(r),
            offset: token.offset + r
          })
        }
      }
    }
    tokensLines[startPosition.line - 1] = newTokensLine
  }
  return result
}
