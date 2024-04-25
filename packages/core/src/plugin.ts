import type { ResolvedPosition } from '@shikijs/core'

import type { IDisposable, Shikitor } from './editor'
import type { Awaitable } from './types'

export type _KeyboardEvent = KeyboardEvent & {
  target: HTMLTextAreaElement
}
interface Keyboards {
  onKeyup?: (this: Shikitor, e: _KeyboardEvent) => void
  onKeydown?: (this: Shikitor, e: _KeyboardEvent) => void
  onKeypress?: (this: Shikitor, e: _KeyboardEvent) => void
}

export interface ShikitorPlugin extends Keyboards {
  name?: string
  install?: (this: Shikitor, editor: Shikitor) => Awaitable<void | IDisposable>
  onChange?: (this: Shikitor, value: string) => void
  onDispose?: (this: Shikitor) => void
  onCursorChange?: (this: Shikitor, cursor?: ResolvedPosition) => void
}

export function definePlugin(plugin: ShikitorPlugin) {
  return plugin
}
