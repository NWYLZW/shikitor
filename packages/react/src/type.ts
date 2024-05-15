import type { _KeyboardEvent, Shikitor, ShikitorOptions } from '@shikitor/core'
import type React from 'react'

export interface StyledProps {
  className?: string
  style?: React.CSSProperties
}

export interface EditorProps {
  options?: Omit<ShikitorOptions, 'plugins'>
  defaultOptions?: Omit<ShikitorOptions, 'plugins'>
  plugins?: ShikitorOptions['plugins']
  value?: string
  defaultValue?: string
  onChange?(value: string): void
  onMounted?(shikitor: Shikitor): void
  onColorChange?(color: {
    bg: string
    fg: string
  }): void
  onKeydown?(e: _KeyboardEvent): void
  onKeyup?(e: _KeyboardEvent): void
  onFocused?(): void
  onBlurred?(): void
}

export type EditorRef = Partial<Shikitor>
