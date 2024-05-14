import { derive } from 'valtio/utils'
import { subscribe } from 'valtio/vanilla'

import type { RefObject } from '../../base'
import { cssvar } from '../../base'
import type { Cursor, ResolvedCursor } from '../../editor'
import type { RawTextHelper } from '../../utils/getRawTextHelper'

export function cursorControlled(
  target: HTMLElement,
  rthRef: RefObject<RawTextHelper>,
  ref: RefObject<{ cursor?: Cursor }>,
  onCursorChange: (cursor: ResolvedCursor) => void
) {
  const defaultCursor = target.querySelector('.shikitor-cursor:first-child') as HTMLElement

  const optionsCursorRef = derive({
    current: get => get(ref).current.cursor
  })
  const cursorRef = derive({
    current: get => {
      const { resolvePosition } = get(rthRef).current
      return resolvePosition(get(optionsCursorRef).current ?? 0)
    }
  })

  let cursorBlinkInterval: NodeJS.Timeout | null = null
  const startCursorBlink = () => {
    if (cursorBlinkInterval) {
      clearInterval(cursorBlinkInterval)
    }
    const cursor = cursorRef.current
    target.style.setProperty(cssvar('cursor-line'), cursor.line.toString())
    target.style.setProperty(cssvar('cursor-char'), `${cursor.character}ch`)
    defaultCursor.classList.add('shikitor-cursor--visible')
    cursorBlinkInterval = setInterval(() => {
      defaultCursor.classList.toggle('shikitor-cursor--visible')
    }, 700) // 0.5s visible, 0.2s hidden
  }
  const dispose = subscribe(cursorRef, () => {
    const cursor = cursorRef.current
    if (cursor === undefined) return
    onCursorChange(cursor)
    startCursorBlink()
  })

  startCursorBlink()
  return {
    cursorRef,
    dispose() {
      dispose()
      cursorBlinkInterval && clearInterval(cursorBlinkInterval)
    }
  }
}
