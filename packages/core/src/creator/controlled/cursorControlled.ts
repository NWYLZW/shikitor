import { derive } from 'valtio/utils'
import { subscribe } from 'valtio/vanilla'

import type { RefObject } from '../../base'
import type { Cursor, ResolvedCursor } from '../../editor'
import type { RawTextHelper } from '../../utils/getRawTextHelper'


export function cursorControlled(
  rthRef: RefObject<RawTextHelper>,
  ref: RefObject<{ cursor?: Cursor }>,
  onCursorChange: (cursor: ResolvedCursor) => void
) {
  const optionsCursorRef = derive({
    current: get => get(ref).current.cursor
  })
  const cursorRef = derive({
    current: get => {
      const { resolvePosition } = get(rthRef).current
      return resolvePosition(get(optionsCursorRef).current ?? 0)
    }
  })
  const dispose = subscribe(cursorRef, () => {
    const cursor = cursorRef.current
    if (cursor === undefined) return
    onCursorChange(cursor)
  })
  return { cursorRef, dispose }
}
