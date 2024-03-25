import type { DecorationItem, ResolvedPosition } from '@shikijs/core'
import type { BundledLanguage, BundledTheme } from 'shiki'

import type { TextRange } from '../base'
import type { ShikitorPlugin } from '../plugin'
import type { ShikitorRegister } from './register'

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

export interface Shikitor extends ShikitorRegister {
  value: string
  language?: BundledLanguage
  options: Readonly<ShikitorOptions>
  focus: (range?: Partial<TextRange>) => void
  updateOptions: UpdateDispatcher<Shikitor['options']>
  updateLanguage: UpdateDispatcher<Shikitor['language']>
  dispose: () => void
}
