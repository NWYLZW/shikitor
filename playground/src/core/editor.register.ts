import type { Awaitable } from '../types'
import type { IDisposable, LanguageSelector } from './editor'

export type PopupPlacement =
  | 'top' | 'bottom'
  // | 'left' | 'right'
  // | 'top-left' | 'top-right'
  // | 'bottom-left' | 'bottom-right'
  // | 'left-top' | 'left-bottom'
  // | 'right-top' | 'right-bottom'

export type PopupCard = {
  id: string
  render(element: HTMLElement): void
}

type RelativeCursorPopupProvider = {
  target: 'cursor'
  offset: 'line-start'
}

type RelativeSelectionPopupProvider = {
  target: 'selection'
}

export type RelativePopupProvider = {
  position: 'relative'
  placement: PopupPlacement
  providePopupCards(cursors: {}[], selections: {}[]): Awaitable<PopupCard[]>
} & (
  | RelativeCursorPopupProvider
  | RelativeSelectionPopupProvider
)

export type AbsolutePopupProvider = {
  position: 'absolute'
  providePopupCards(): Awaitable<PopupCard[]>
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
