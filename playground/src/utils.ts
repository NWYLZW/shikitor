import type { DecorationItem, OffsetOrPosition, ResolvedPosition, ThemedToken } from '@shikijs/core'

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

export type DecoratedThemedToken = ThemedToken & { tagName?: string }
export type Decoration = Pick<DecorationItem, 'start' | 'end' | 'tagName'>
export type ResolvedDecoration =
  & Omit<
    Decoration, 'start' | 'end'
  >
  & {
    start: ResolvedPosition
    end: ResolvedPosition
  }

export function decorateTokens(
  rawText: string,
  tokensLines: DecoratedThemedToken[][],
  decorations: Decoration[]
) {
  const { getResolvedPositions } = getRawTextHelper(rawText)
  const tokenDecorationsMap = new Map<DecoratedThemedToken, ResolvedDecoration[]>()
  for (const decoration of decorations) {
    const { start, end, ...omitStartAndEndDecoration } = decoration
    const startResolved = getResolvedPositions(start)
    const endResolved = getResolvedPositions(end)
    const tokens = tokensLines[startResolved.line - 1]
    if (!tokens) {
      continue
    }
    for (const token of tokens) {
      const tokenStart = token.offset
      const tokenEnd = token.offset + token.content.length
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
      if (!(endResolved.offset <= tokenStart || tokenEnd <= startResolved.offset)) {
        const tokenDecorations = tokenDecorationsMap.get(token) ?? []
        tokenDecorationsMap.set(token, tokenDecorations)
        tokenDecorations.push({
          ...omitStartAndEndDecoration,
          start: startResolved,
          end: endResolved
        })
      }
    }
  }
  const result: DecoratedThemedToken[][] = []
  for (const tokens of tokensLines) {
    const ntks: DecoratedThemedToken[] = []
    result.push(ntks)
    for (const token of tokens) {
      const tokenStart = token.offset
      const tokenEnd = token.offset + token.content.length
      const decorations = tokenDecorationsMap.get(token)
      if (decorations) {
        const points: Record<number, ResolvedDecoration[]> = {}
        points[0] = []
        points[token.content.length] = []
        for (const decoration of decorations) {
          const { start, end } = decoration
          const l = start.offset > tokenStart
            ? start.offset - tokenStart
            : 0
          const r = end.offset < tokenEnd
            ? end.offset - tokenStart
            : token.content.length
          points[l] = points[l] ?? []
          points[l].push(decoration)
          points[r] = points[r] ?? []
        }
        const pointIndexes = Object.keys(points).map(Number).sort((a, b) => a - b)
        for (let i = 0; i < pointIndexes.length - 1; i++) {
          const l = pointIndexes[i]
          const r = pointIndexes[i + 1]
          const lDecorations = points[l]
          if (lDecorations.length) {
            const tagNames = lDecorations.map(d => d.tagName).filter(Boolean)
            ntks.push({
              ...token,
              content: token.content.slice(l, r),
              offset: token.offset + l,
              tagName: tagNames.join(' ')
            })
          } else {
            ntks.push({
              ...token,
              content: token.content.slice(l, r),
              offset: token.offset + l
            })
          }
        }
      } else {
        ntks.push(token)
      }
    }
  }
  return result
}

interface EventEmitter {
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void
}
interface ListenOptions extends AddEventListenerOptions {
}
export function listen<K extends keyof DocumentEventMap>(
  element: Document, type: K, listener: (this: Document, ev: DocumentEventMap[K]) => any, options?: boolean | ListenOptions
): () => void
export function listen<
  Elem extends HTMLElement, EventMap extends HTMLElementEventMap, K extends keyof EventMap
>(
  element: Elem, type: K, listener: (this: Elem, ev: EventMap[K]) => any, options?: boolean | ListenOptions
): () => void
export function listen(
  element: EventEmitter, type: string, listener: (ev: Event) => any, options?: boolean | ListenOptions
): () => void {
  element.addEventListener(type, listener, options)
  return () => element.removeEventListener(type, listener, options)
}
