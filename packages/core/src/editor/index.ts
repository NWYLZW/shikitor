import type { DecorationItem, ResolvedPosition } from '@shikijs/core'
import type { BundledLanguage, BundledTheme } from 'shiki'

import type { ShikitorPlugin } from '../plugin'
import type { Awaitable } from '../types'
import type { Cursor, ResolvedCursor, Selection } from './base'
import type { ShikitorRegister } from './register'

export * from './base'

interface ShikitorEvents {
  onChange?: (value: string) => void
  onCursorChange?: (cursor?: ResolvedCursor) => void
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
    /**
     * [{}, Promise.resolve({}), import()]
     */
    | Awaitable<ShikitorPlugin>
    /**
     * [() => ({}), () => Promise.resolve({}), () => import()]
     */
    | (() => Awaitable<ShikitorPlugin>)
  )[]
}

export type UpdateDispatcher<T, Args extends unknown[] = []> = (...args: [...Args, value: T | ((value: T) => T)]) => void

export function callUpdateDispatcher<T>(value: T | ((value: T) => T), oldValue: T) {
  if (typeof value === 'function') {
    (value as Function)(oldValue)
  } else {
    return value
  }
}

export interface Shikitor extends ShikitorRegister {
  value: string
  language?: BundledLanguage
  options: Readonly<ShikitorOptions>
  readonly cursor: ResolvedCursor
  focus: (cursor?: Cursor) => void
  readonly selections: readonly Selection[]
  updateOptions: UpdateDispatcher<Shikitor['options']>
  updateLanguage: UpdateDispatcher<Shikitor['language']>
  updateSelection: UpdateDispatcher<Selection, [index: number]>
  dispose: () => void
}
