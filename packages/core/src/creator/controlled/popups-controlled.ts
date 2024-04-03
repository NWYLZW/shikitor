import './popups-controlled.scss'

import { proxy, snapshot, subscribe } from 'valtio/vanilla'

import type { ResolvedPopup } from '../../editor/register'
import { classnames } from '../../utils/classnames'

const prefix = `${'shikitor'}-popup`

export function popupsControlled(container: HTMLElement) {
  const popups = proxy<ResolvedPopup[]>([])
  const render = () => {
    const popupsSnapshot = snapshot(popups)
    popupsSnapshot.forEach(popup => {
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
    })
  }
  return {
    popups, dispose: subscribe(popups, render)
  }
}
