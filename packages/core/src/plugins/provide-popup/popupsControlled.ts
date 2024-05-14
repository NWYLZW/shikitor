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
  const passedOffset = {
    top: undefined,
    left: undefined,
    bottom: undefined,
    right: undefined
  } as {
    top?: number
    left?: number
    bottom?: number
    right?: number
  }
  const passedKeys = Object.keys(passedOffset) as (keyof typeof passedOffset)[]
  if (popup.position === 'absolute') {
    for (const key of passedKeys) {
      const value = popup.offset[key]
      if (value !== undefined) {
        passedOffset[key] = value
      }
    }
  }
  const containerRect = shikitor.element.getBoundingClientRect()
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
    const { x: _x, y: _y } = shikitor._getCursorAbsolutePosition(
      cursor,
      popup.placement === 'top' ? -1 : 0
    )
    const x = _x + containerRect.left
    const y = _y + containerRect.top
    const paddingTop = getComputedStyle(shikitor.element).paddingTop
    if (popup.placement === 'top') {
      ele.style.transform = `translateY(-100%)`
    }
    const lines = shikitor.element.querySelector(`:scope > .${'shikitor'}-lines`)
    passedOffset.top = y + parseInt(paddingTop)
    passedOffset.left = (lines?.clientWidth ?? 0) + x
  }
  for (const key of passedKeys) {
    if (passedOffset[key] !== undefined) {
      ele.style.setProperty(`--${key}`, `${passedOffset[key]}px`)
      const realOffset = `calc(var(--${key}, 0px) + var(--offset-${
        key === 'top' || key === 'bottom' ? 'y' : 'x'
      }, 0px))`
      ele.style[key] = `max(${realOffset}, ${containerRect[key]}px)`
    }
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
