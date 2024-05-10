import type { DecorationItem, ResolvedPosition } from '@shikijs/core'
import type { BundledLanguage, BundledTheme } from 'shiki'

import type { RefObject } from '../base'
import type { ShikitorPlugin } from '../plugin'
import type { Awaitable, Pretty, RecursiveReadonly, U2I } from '../types'
import type { UpdateDispatcher } from '../utils/callUpdateDispatcher'
import type { RawTextHelper } from '../utils/getRawTextHelper'
import type { Cursor, IDisposable, ResolvedCursor, ResolvedSelection, Selection } from './base'
import type { EventEmitter, EventMap } from './base.eventEmitter'

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
    this: Shikitor<ThisKeys>,
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
  extended(name: ShikitorExtendable | (string & {}) | undefined): Awaitable<void>
  contracted(name: ShikitorExtendable | (string & {}) | undefined): Awaitable<void>
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
  placeholder?: string
  /**
   * @default false
   *
   * automatically adjust the height of the textarea
   */
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

export interface ShikitorInternal {
  /**
   * @internal
   */
  _getCursorAbsolutePosition: (
    this: Shikitor,
    cursor: ResolvedCursor,
    lineOffset?: number
  ) => { x: number; y: number }
  /**
   * @internal
   */
  ee: EventEmitter<ShikitorEventMap>
}

export interface ShikitorSupportExtend<
  Keys extends ShikitorExtendable = never
> {
  depend: Depend<Keys>
  extend: <K extends ShikitorExtendable>(
    this: Shikitor<Keys>,
    key: K,
    obj: ShikitorExtend<K>
  ) => IDisposable
}

export interface ShikitorSupportPlugin {
  upsertPlugin: (this: Shikitor, plugin: InputShikitorPlugin, index?: number) => Promise<number>
  removePlugin: (this: Shikitor, index: number) => void
}

export interface ShikitorBase {
  readonly element: HTMLElement
  value: string

  language?: BundledLanguage
  updateLanguage: UpdateDispatcher<Shikitor['language']>

  options:
    & RecursiveReadonly<Omit<ShikitorOptions, 'plugins'>>
    & RecursiveReadonly<{
      plugins: ShikitorPlugin[]
    }>
  readonly optionsRef: RefObject<ShikitorOptions>
  updateOptions: UpdateDispatcher<RecursiveReadonly<ShikitorOptions>, [], Promise<void>, Shikitor['options']>

  readonly cursor: ResolvedCursor
  focus: (cursor?: Cursor) => void
  blur: () => void

  readonly selections: readonly ResolvedSelection[]
  readonly selectionsRef: RefObject<ResolvedSelection[]>
  updateSelection: UpdateDispatcher<Selection, [index: number]>

  readonly rawTextHelper: RawTextHelper
}

export interface Shikitor<
  Keys extends ShikitorExtendable = never
> extends ShikitorBase, ShikitorSupportExtend<Keys>, ShikitorSupportPlugin, ShikitorInternal, Disposable {
}
