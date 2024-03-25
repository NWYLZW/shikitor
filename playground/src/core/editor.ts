import type { DecorationItem, OffsetOrPosition, ResolvedPosition } from '@shikijs/core'
import type { BundledLanguage, BundledTheme } from 'shiki'

import type { TextRange } from './base'
import type { ResolvedTextRange, TextRange } from './base'
import type { ShikitorPlugin } from './plugin'

export type Cursor = OffsetOrPosition
export type Selection = TextRange
export interface ResolvedCursor extends ResolvedPosition {}
export interface ResolvedSelection extends ResolvedTextRange {}

export type LanguageSelector = '*' | BundledLanguage

export interface ShikitorEvents {
  onChange?: (value: string) => void
  onCursorChange?: (cursor?: ResolvedPosition) => void
  onDispose?: () => void
}

export interface ShikitorOptions extends ShikitorEvents {
  value?: string
  cursor?: ResolvedPosition
  language?: BundledLanguage
  lineNumbers?: 'on' | 'off'
  readOnly?: boolean
  theme?: BundledTheme
  decorations?: Pick<DecorationItem, 'start' | 'end' | 'tagName'>[]
  plugins?: (
    | ShikitorPlugin
    | (() => ShikitorPlugin | Promise<ShikitorPlugin>)
  )[]
}

export type UpdateDispatcher<T> = (value: T | ((value: T) => T)) => void

export function callUpdateDispatcher<T>(value: T | ((value: T) => T), oldValue: T) {
  if (typeof value === 'function') {
    (value as Function)(oldValue)
  } else {
    return value
  }
}

export interface IDisposable {
  dispose(): void
}

export interface Shikitor {
  value: string
  language?: BundledLanguage
  options: Readonly<ShikitorOptions>
  focus: (range?: Partial<TextRange>) => void
  updateOptions: UpdateDispatcher<Shikitor['options']>
  updateLanguage: UpdateDispatcher<Shikitor['language']>
  dispose: () => void
}
