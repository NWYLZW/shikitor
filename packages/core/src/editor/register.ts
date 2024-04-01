import type { ResolvedTextRange } from '../base'
import type { Awaitable } from '../types'
import type { IDisposable, LanguageSelector, ResolvedCursor } from './base'

export type PopupPlacement =
  | 'top' | 'bottom'
  // | 'left' | 'right'
  // | 'top-left' | 'top-right'
  // | 'bottom-left' | 'bottom-right'
  // | 'left-top' | 'left-bottom'
  // | 'right-top' | 'right-bottom'

export type Popup = {
  id: string
  render(element: HTMLElement): void
}

type RelativeCursorPopupProvider = {
  target: 'cursor'
  offset?: 'line-start'
}

type RelativeSelectionPopupProvider = {
  target: 'selection'
}

export type RelativePopupProvider = {
  position: 'relative'
  placement: PopupPlacement
  providePopups(cursors: ResolvedCursor[], selections: ResolvedTextRange[]): Awaitable<Popup[]>
} & (
  | RelativeCursorPopupProvider
  | RelativeSelectionPopupProvider
)

export type AbsolutePopupProvider = {
  position: 'absolute'
  providePopupCards(): Awaitable<Popup[]>
  offset: {
    x: number
    y: number
  }
}

export type PopupProvider = {
} & (
  | RelativePopupProvider
  | AbsolutePopupProvider
)

export interface ShikitorRegister {
  registerPopupProvider(language: LanguageSelector, provider: PopupProvider): IDisposable
}
