import type { ResolvedPosition } from '@shikijs/core'

import type { ResolvedTextRange } from './base'
import type { Shikitor } from './editor'

export interface OnHoverElementContext {
  content: string
  element: Element
  raw: string
}

export interface ShikitorPlugin {
  name?: string
  install?: (this: Shikitor, editor: Shikitor) => void
  onDispose?: (this: Shikitor) => void
  onCursorChange?: (this: Shikitor, cursor?: ResolvedPosition) => void
  onHoverElement?: (this: Shikitor, range: ResolvedTextRange, context: OnHoverElementContext) => void
}

export function definePlugin(plugin: ShikitorPlugin) {
  return plugin
}
