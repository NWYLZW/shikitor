import type { Shikitor, ShikitorOptions } from '@shikitor/core'

export interface EditorProps {
  options?: ShikitorOptions
  defaultOptions?: ShikitorOptions
  onMounted?(shikitor: Shikitor): void
  onColorChange?(color: {
    bg: string
    fg: string
  }): void
}

export type EditorRef = Partial<Shikitor>
