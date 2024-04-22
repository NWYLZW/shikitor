import type { Shikitor, ShikitorOptions } from '@shikitor/core'

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
}

export type EditorRef = Partial<Shikitor>
