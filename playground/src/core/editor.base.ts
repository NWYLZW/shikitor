import type { OffsetOrPosition, ResolvedPosition } from '@shikijs/core'
import type { BundledLanguage } from 'shiki'

import type { ResolvedTextRange, TextRange } from './base'

export type Cursor = OffsetOrPosition
export type Selection = TextRange
export interface ResolvedCursor extends ResolvedPosition {}
export interface ResolvedSelection extends ResolvedTextRange {}

export type LanguageSelector = '*' | BundledLanguage
