import type { DecorationItem, ResolvedPosition } from '@shikijs/core'
import type { BundledLanguage, BundledTheme } from 'shiki'

import type { ShikitorPlugin } from '../plugin'
import type { Awaitable, RecursiveReadonly } from '../types'
import type { RawTextHelper } from '../utils/getRawTextHelper'
import type { Cursor, ResolvedCursor, ResolvedSelection, Selection } from './base'
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
  decorations?: DecorationItem[]
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

export type UpdateDispatcher<T, Args extends unknown[] = [], RT = void> = (...args: [...Args, value: T | ((value: T) => T)]) => RT

export function callUpdateDispatcher<T>(value: T | ((value: T) => T), oldValue: T) {
  if (typeof value === 'function') {
    return (value as Function)(oldValue)
  } else {
    return value
  }
}

interface InternalShikitor {
  /**
   * @internal
   */
  _getCursorAbsolutePosition: (cursor: ResolvedCursor) => { x: number, y: number }
}

export interface Shikitor extends InternalShikitor, ShikitorRegister {
  value: string
  language?: BundledLanguage
  options: RecursiveReadonly<ShikitorOptions>
  readonly cursor: ResolvedCursor
  focus: (cursor?: Cursor) => void
  readonly selections: readonly ResolvedSelection[]
  readonly rawTextHelper: RawTextHelper
  updateOptions: UpdateDispatcher<Shikitor['options'], [], Promise<void>>
  updateLanguage: UpdateDispatcher<Shikitor['language']>
  updateSelection: UpdateDispatcher<Selection, [index: number]>
  upsertPlugin: (plugin: NonNullable<ShikitorOptions['plugins']>[number], index?: number) => Promise<number>
  removePlugin: (index: number) => void
  dispose: () => void
}
