import type { ResolvedTextRange } from '../base'
import type { Awaitable, RecursiveReadonly } from '../types'
import type { IDisposable, LanguageSelector, ResolvedCursor } from './base'

export type RelativePopupPlacement =
  | 'top' | 'bottom'
  // | 'left' | 'right'
  // | 'top-left' | 'top-right'
  // | 'bottom-left' | 'bottom-right'
  // | 'left-top' | 'left-bottom'
  // | 'right-top' | 'right-bottom'

export type AbsolutePopupPlacement =
  | 'top-left' | 'top-right'
  | 'bottom-left' | 'bottom-right'
  | 'left-top' | 'left-bottom'
  | 'right-top' | 'right-bottom'

export interface Popup {
  id: string
  render(element: HTMLElement): void
}

export type ResolvedPopup = Popup & (
  | RelativePopup & {
    cursors: RecursiveReadonly<ResolvedCursor[]>
    selections: RecursiveReadonly<ResolvedTextRange[]>
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
  offset?: 'line-start'
}

type RelativeSelectionPopup = {
  target: 'selection'
}

export type RelativePopup = BasePopup & {
  position: 'relative'
  placement: RelativePopupPlacement
} & (
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

export type PopupProvider = {
} & (
  | (RelativePopup & {
    providePopups(cursors: ResolvedCursor[], selections: ResolvedTextRange[]): Awaitable<PopupList>
  })
  | (AbsolutePopup & {
    providePopups(): Awaitable<PopupList>
  })
)

export interface ShikitorRegister {
  registerPopupProvider(language: LanguageSelector, provider: PopupProvider): IDisposable
}
