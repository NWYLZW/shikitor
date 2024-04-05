import './popupsControlled.scss'

import { proxy, snapshot, subscribe } from 'valtio/vanilla'

import type { Shikitor } from '../../editor'
import type { ResolvedPopup } from '../../editor/register'
import { classnames } from '../../utils/classnames'

const prefix = `${'shikitor'}-popup`

function mountPopup(shikitor: Shikitor, container: HTMLElement, popup: ResolvedPopup) {
  const ele = document.createElement('div')
  ele.className = classnames(
    prefix,
    `${prefix}-${popup.id}`,
    `${prefix}-${popup.position}`
  )
  popup.width && (ele.style.width = `${popup.width}px`)
  popup.height && (ele.style.height = `${popup.height}px`)
  if (popup.position === 'absolute') {
    ele.style.top = `${popup.offset.top ?? 0}px`
    ele.style.left = `${popup.offset.left ?? 0}px`
    popup.offset.bottom && (ele.style.bottom = `${popup.offset.bottom}px`)
    popup.offset.right && (ele.style.right = `${popup.offset.right}px`)
  }
  if (popup.position === 'relative' && popup.target === 'cursor') {
    const [cursor] = popup.cursors
    const { x, y } = shikitor._getCursorAbsolutePosition(cursor)
    if (popup.placement === 'bottom') {
      ele.style.top = `${y}px`
      ele.style.left = `${x}px`
    }
  }
  popup.render(ele)
  container.appendChild(ele)
  return ele
}

export function popupsControlled(getShikitor: () => Shikitor, container: HTMLElement) {
  const popups = proxy<ResolvedPopup[]>([])
  const prevPopupElements = new Map<ResolvedPopup, HTMLDivElement>()
  const dispose = subscribe(popups, () => {
    const shikitor = getShikitor()
    const popupsSnapshot = snapshot(popups)
    // diff prev popups elements
    // 1. new popups
    // 2. remove popups
    // 3. update popups
    const newPopupElements = new Map<ResolvedPopup, HTMLDivElement>()
    for (const popup of popupsSnapshot) {
      let ele = prevPopupElements.get(popup)
      if (!ele) {
        ele = mountPopup(shikitor, container, popup)
      }
      newPopupElements.set(popup, ele)
    }
    for (const [popup, ele] of prevPopupElements) {
      if (!newPopupElements.has(popup)) {
        ele.remove()
      }
    }
    prevPopupElements.clear()
    for (const [popup, ele] of newPopupElements) {
      prevPopupElements.set(popup, ele)
    }
  })
  return {
    popups, dispose
  }
}
