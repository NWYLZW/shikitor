import './popupsControlled.scss'

import { proxy } from 'valtio/vanilla'

import type { Shikitor } from '../../editor'
import type { ResolvedPopup } from '../../editor/register'
import { classnames } from '../../utils/classnames'
import { debounceSubscribe } from '../../utils/valtio/debounceSubscribe'

const prefix = `${'shikitor'}-popup`

function updatePopupElement(shikitor: Shikitor, ele: HTMLElement, popup: ResolvedPopup) {
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
    if (!popup.cursors) return ele

    const [cursor] = popup.cursors
    const { x, y } = shikitor._getCursorAbsolutePosition(cursor)
    if (popup.placement === 'bottom') {
      ele.style.top = `${y}px`
      ele.style.left = `${x}px`
    }
  }
}
function mountPopup(shikitor: Shikitor, container: HTMLElement, popup: ResolvedPopup) {
  const ele = document.createElement('div')
  updatePopupElement(shikitor, ele, popup)
  popup.render(ele)
  container.appendChild(ele)
  return ele
}

export function popupsControlled(getShikitor: () => Shikitor, container: HTMLElement) {
  const popups = proxy<ResolvedPopup[]>([])
  const prevPopupElements = new Map<ResolvedPopup, HTMLDivElement>()
  const dispose = debounceSubscribe(popups, () => {
    const shikitor = getShikitor()
    const newPopupElements = new Map<ResolvedPopup, HTMLDivElement>()
    for (const popup of popups) {
      let ele = prevPopupElements.get(popup)
      if (ele) {
        updatePopupElement(shikitor, ele, popup)
      } else {
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
