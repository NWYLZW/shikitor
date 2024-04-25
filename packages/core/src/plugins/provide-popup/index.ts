import { derive } from 'valtio/utils'

import type { ResolvedTextRange } from '../../base'
import type { IDisposable, ResolvedCursor } from '../../editor'
import { definePlugin } from '../../plugin'
import type { Awaitable, RecursiveReadonly } from '../../types'
import { scoped } from '../../utils/valtio/scoped'
import { popupsControlled } from './popupsControlled'

export type RelativePopupPlacement = 'top' | 'bottom'
// | 'left' | 'right'
// | 'top-left' | 'top-right'
// | 'bottom-left' | 'bottom-right'
// | 'left-top' | 'left-bottom'
// | 'right-top' | 'right-bottom'

export type AbsolutePopupPlacement =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'left-top'
  | 'left-bottom'
  | 'right-top'
  | 'right-bottom'

export interface Popup {
  id: string
  render(element: HTMLDivElement): void
}

export type ResolvedPopup =
  & Popup
  & (
    | RelativePopup & {
      cursors?: RecursiveReadonly<(ResolvedCursor | void)[]>
      selections?: RecursiveReadonly<ResolvedTextRange[]>
    }
    | AbsolutePopup
  )

export interface PopupList extends Partial<IDisposable> {
  popups: Popup[]
}

export type BasePopup = {
  /**
   * The width of the popup.
   * If not provided, the popup will be auto-sized.
   */
  width?: number
  /**
   * The height of the popup.
   * If not provided, the popup will be auto-sized.
   */
  height?: number
}

type RelativeCursorPopup = {
  target: 'cursor'
  // TODO
  offset?: 'line-start'
}

type RelativeSelectionPopup = {
  target: 'selection'
  // TODO
  offset?:
    | 'selection-start'
    | 'selection-end'
}

export type RelativePopup =
  & BasePopup
  & {
    position: 'relative'
    placement: RelativePopupPlacement
    hiddenOnNoCursor?: boolean
  }
  & (
    | RelativeCursorPopup
    | RelativeSelectionPopup
  )

export type AbsolutePopup = BasePopup & {
  position: 'absolute'
  offset: {
    top?: number
    left?: number
    right?: number
    bottom?: number
  }
  // TODO
  // placement: AbsolutePopupPlacement
}

export type PopupProvider =
  & {
    providePopups(): Awaitable<PopupList>
  }
  & (
    | RelativePopup
    | AbsolutePopup
  )

const name = 'provide-popup'

declare module '@shikitor/core' {
  interface ShikitorProvidePopup {
    registerPopupProvider(provider: PopupProvider): IDisposable
  }
  interface ShikitorExtends {
    'provide-popup': ShikitorProvidePopup
  }
}

export default () => {
  return definePlugin({
    name,
    install() {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const shikitor = this
      const { disposeScoped, scopeWatch } = scoped()
      const {
        dispose: disposePopupsControlled,
        popups
      } = popupsControlled(() => shikitor)
      const cursorRef = derive({
        current: get => get(this.optionsRef).current.cursor
      })
      const extendDisposable = shikitor.extend('provide-popup', {
        registerPopupProvider(provider) {
          const { providePopups, ...meta } = provider
          const popupsPromise = Promise.resolve(providePopups())

          let pushedFirstPopupRef: ResolvedPopup | undefined
          let pushedPopupsLength = 0
          let popupsProvideDispose: (() => void) | undefined
          popupsPromise.then(({ dispose, popups: newPopups }) => {
            popupsProvideDispose = dispose
            const resolvedPopups = newPopups.map(popup => ({
              ...meta,
              ...popup
            })) as ResolvedPopup[]
            popups.push(...resolvedPopups)
            pushedPopupsLength = resolvedPopups.length
            pushedFirstPopupRef = popups[popups.length - pushedPopupsLength]
          })
          const removeNewPopups = () => {
            if (pushedFirstPopupRef === undefined) return
            const firstIndex = popups.indexOf(pushedFirstPopupRef)

            popups.splice(firstIndex, pushedPopupsLength)
          }
          const disposePositionRerender = meta.position === 'relative'
            ? scopeWatch(async get => {
              const cursor = get(cursorRef).current
              if (pushedFirstPopupRef === undefined) return

              const firstIndex = popups.indexOf(pushedFirstPopupRef)
              if (firstIndex === -1) return
              for (let i = firstIndex; i < firstIndex + pushedPopupsLength; i++) {
                const popup = popups[i]
                if (popup.position === 'relative') {
                  popup.cursors = [cursor]
                  popup.selections = shikitor.selections
                }
              }
            })
            : undefined
          return {
            dispose() {
              if (popupsProvideDispose) {
                popupsProvideDispose()
              } else {
                popupsPromise.then(({ dispose }) => dispose?.())
              }
              disposePositionRerender?.()
              removeNewPopups?.()
            }
          }
        }
      })
      return {
        dispose() {
          disposeScoped()
          disposePopupsControlled()
          extendDisposable.dispose?.()
        }
      }
    }
  })
}
