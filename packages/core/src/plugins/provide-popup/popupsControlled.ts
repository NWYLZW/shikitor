import './popupsControlled.scss'

import { proxy } from 'valtio/vanilla'

import type { Shikitor } from '../../editor'
import { classnames } from '../../utils/classnames'
import { debounceSubscribe } from '../../utils/valtio/debounceSubscribe'
import type { ResolvedPopup } from './index'

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
  if (popup.position === 'relative') {
    if (!popup.cursors) return
    if (!popup.selections) return

    const [cursor] = popup.cursors
    if (!cursor) {
      if (popup.hiddenOnNoCursor) {
        ele.style.display = 'none'
      }
      return
    } else {
      ele.style.display = ''
    }
    const [selection] = popup.selections
    if (popup.target === 'selection') {
      if (!selection || selection.start.offset === selection.end.offset) {
        ele.style.display = 'none'
        return
      } else {
        ele.style.display = ''
      }
    }
    const { x, y } = shikitor._getCursorAbsolutePosition(
      cursor,
      popup.placement === 'top' ? -1 : 0
    )
    ele.style.top = `${y}px`
    if (popup.placement === 'top') {
      ele.style.transform = 'translateY(-100%)'
    }
    ele.style.left = `${x}px`
  }
}
export function mountPopup(shikitor: Shikitor, popup: ResolvedPopup) {
  const ele = document.createElement('div')
  updatePopupElement(shikitor, ele, popup)
  popup.render(ele)
  shikitor.element.appendChild(ele)
  return ele
}

export function popupsControlled(getShikitor: () => Shikitor) {
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
        ele = mountPopup(shikitor, popup)
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
    popups,
    dispose
  }
}
