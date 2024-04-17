import type { Shikitor, ShikitorOptions } from '@shikitor/core'

export interface EditorProps {
  options?: ShikitorOptions
  defaultOptions?: ShikitorOptions
  value?: string
  defaultValue?: string
  onChange?(value: string): void
  onMounted?(shikitor: Shikitor): void
  onColorChange?(color: {
    bg: string
    fg: string
  }): void
}

export type EditorRef = Partial<Shikitor>
