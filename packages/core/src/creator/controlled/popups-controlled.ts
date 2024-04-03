import './popups-controlled.scss'

import { proxy, snapshot, subscribe } from 'valtio/vanilla'

import type { ResolvedPopup } from '../../editor/register'
import { classnames } from '../../utils/classnames'

const prefix = `${'shikitor'}-popup`

function mountPopup(container: HTMLElement, popup: ResolvedPopup) {
  const ele = document.createElement('div')
  ele.className = classnames(prefix, `${prefix}-${popup.id}`)
  if (popup.position === 'absolute') {
    ele.className = classnames(
      ele.className, `${prefix}-absolute`
    )
    ele.style.top = `${popup.offset.top ?? 0}px`
    popup.offset.left && (ele.style.left = `${popup.offset.left}px`)
    popup.offset.bottom && (ele.style.bottom = `${popup.offset.bottom}px`)
    popup.offset.right && (ele.style.right = `${popup.offset.right}px`)
    popup.render(ele)
    container.appendChild(ele)
  }
  return ele
}

export function popupsControlled(container: HTMLElement) {
  const popups = proxy<ResolvedPopup[]>([])
  const prevPopupElements = new Map<ResolvedPopup, HTMLDivElement>()
  const dispose = subscribe(popups, () => {
    const popupsSnapshot = snapshot(popups)
    // diff prev popups elements
    // 1. new popups
    // 2. remove popups
    // 3. update popups
    const newPopupElements = new Map<ResolvedPopup, HTMLDivElement>()
    for (const popup of popupsSnapshot) {
      let ele = prevPopupElements.get(popup)
      if (!ele) {
        ele = mountPopup(container, popup)
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
