import type { DecorationItem, ResolvedPosition } from '@shikijs/core'
import type { BundledLanguage, BundledTheme } from 'shiki'

import type { TextRange } from './base'
import type { ShikitorPlugin } from './plugin'

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
    | (() => ShikitorPlugin)
  )[]
}

export interface Shikitor {
  value: string
  language?: BundledLanguage
  options: Readonly<ShikitorOptions>
  focus: (range?: Partial<TextRange>) => void
  updateOptions: (options: ShikitorOptions | ((options: ShikitorOptions) => ShikitorOptions)) => void
  updateLanguage: (language: BundledLanguage) => void
  dispose: () => void
}
