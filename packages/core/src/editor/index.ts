import type { DecorationItem, ResolvedPosition } from '@shikijs/core'
import type { BundledLanguage, BundledTheme } from 'shiki'

import type { RefObject } from '../base'
import type { ShikitorPlugin } from '../plugin'
import type { Awaitable, Pretty, RecursiveReadonly, U2I } from '../types'
import type { UpdateDispatcher } from '../utils/callUpdateDispatcher'
import type { RawTextHelper } from '../utils/getRawTextHelper'
import type { Cursor, IDisposable, ResolvedCursor, ResolvedSelection, Selection } from './base'
import type { EventEmitter, EventMap } from './base.eventEmitter'
import type { ShikitorRegister } from './register'

export * from './base'

export interface ShikitorExtends {
}

type ShikitorExtendable = keyof ShikitorExtends

// @dprint-ignore
type ShikitorExtend<Keys extends ShikitorExtendable> = Pretty<U2I<
  Keys extends infer K extends ShikitorExtendable
    ? ShikitorExtends[K]
    : never
>>

interface Depend<
  ThisKeys extends ShikitorExtendable
> {
  <Keys extends Exclude<ShikitorExtendable, ThisKeys>>(
    keys: Keys[],
    listener: (
      shikitor:
        & Shikitor<ThisKeys>
        & ShikitorExtend<Keys>
    ) => void | IDisposable
  ): IDisposable
}

export interface ShikitorEventMap extends EventMap {
  change(value: string): Awaitable<void>
  install(name: string | undefined, shikitor: Shikitor): Awaitable<void>
  dispose(name: string | undefined): Awaitable<void>
}

interface ShikitorEvents {
  onChange?: (value: string) => void
  onCursorChange?: (cursor?: ResolvedCursor) => void
  onDispose?: () => void
}

export type InputShikitorPlugin =
  /**
   * [{}, Promise.resolve({}), import()]
   */
  | Awaitable<ShikitorPlugin>
  /**
   * [() => ({}), () => Promise.resolve({}), () => import()]
   */
  | (() => Awaitable<ShikitorPlugin>)

export interface ShikitorOptions extends ShikitorEvents {
  value?: string
  cursor?: ResolvedPosition
  language?: BundledLanguage
  lineNumbers?: 'on' | 'off'
  autoSize?: boolean | {
    /**
     * @default 1
     */
    minRows?: number
    /**
     * @default 5
     */
    maxRows?: number
  }
  readOnly?: boolean
  theme?: BundledTheme
  decorations?: DecorationItem[]
  plugins?: InputShikitorPlugin[]
}

interface InternalShikitor {
  /**
   * @internal
   */
  _getCursorAbsolutePosition: (cursor: ResolvedCursor) => { x: number; y: number }
  /**
   * @internal
   */
  ee: EventEmitter<ShikitorEventMap>
}

export interface Shikitor<
  Keys extends ShikitorExtendable = never
> extends InternalShikitor, ShikitorRegister, Disposable {
  value: string
  language?: BundledLanguage
  options:
    & RecursiveReadonly<Omit<ShikitorOptions, 'plugins'>>
    & RecursiveReadonly<{
      plugins: ShikitorPlugin[]
    }>
  optionsRef: RefObject<ShikitorOptions>
  readonly cursor: ResolvedCursor
  focus: (cursor?: Cursor) => void
  readonly selections: readonly ResolvedSelection[]
  readonly rawTextHelper: RawTextHelper
  updateOptions: UpdateDispatcher<RecursiveReadonly<ShikitorOptions>, [], Promise<void>, Shikitor['options']>
  updateLanguage: UpdateDispatcher<Shikitor['language']>
  updateSelection: UpdateDispatcher<Selection, [index: number]>
  upsertPlugin: (plugin: InputShikitorPlugin, index?: number) => Promise<number>
  removePlugin: (index: number) => void

  depend: Depend<Keys>
  extend: <K extends ShikitorExtendable>(
    key: K,
    obj: ShikitorExtend<K>
  ) => () => void
}
