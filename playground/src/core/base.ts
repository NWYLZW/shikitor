import type { OffsetOrPosition, ResolvedPosition } from '@shikijs/core'

export interface TextRange {
  start: OffsetOrPosition
  end: OffsetOrPosition
}
export interface ResolvedTextRange {
  start: ResolvedPosition
  end: ResolvedPosition
}
