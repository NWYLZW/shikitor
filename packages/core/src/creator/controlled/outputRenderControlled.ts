import { transformerRenderWhitespace } from '@shikijs/transformers'
import { getHighlighter } from 'shiki'
import { derive } from 'valtio/utils'
import { snapshot } from 'valtio/vanilla'

import type { RefObject } from '../../base'
import type { ResolvedCursor, ShikitorOptions } from '../../editor'
import { scoped } from '../../utils/valtio/scoped'
import { HIGHLIGHTED } from '../classes'
import { shikitorStructureTransformer } from '../structureTransfomer'

export function outputRenderControlled(
  { target, output }: {
    target: HTMLElement
    output: HTMLElement
  },
  { valueRef, cursorRef, optionsRef }: {
    valueRef: RefObject<string>
    cursorRef: RefObject<ResolvedCursor>
    optionsRef: RefObject<ShikitorOptions>
  }
) {
  const { scopeWatch, scopeSubscribe, disposeScoped } = scoped()
  scopeWatch(get => {
    const {
      readOnly,
      lineNumbers = 'on'
    } = get(derive({
      readOnly: get => get(optionsRef).current.readOnly,
      lineNumbers: get => get(optionsRef).current.lineNumbers
    }))
    target.classList.toggle('line-numbers', lineNumbers === 'on')
    target.classList.toggle('read-only', readOnly === true)
  })
  let highlighter: ReturnType<typeof getHighlighter> | undefined
  const highlighterDeps = derive({
    theme: get => get(optionsRef).current.theme,
    language: get => get(optionsRef).current.language
  })
  scopeWatch(async get => {
    const {
      theme = 'github-light',
      language = 'javascript'
    } = get(highlighterDeps)
    highlighter = getHighlighter({ themes: [theme], langs: [language] })
  })
  const outputRenderDeps = derive({
    theme: get => get(optionsRef).current.theme,
    language: get => get(optionsRef).current.language,
    // TODO remove decorations
    decorations: get => get(optionsRef).current.decorations
  })
  scopeWatch(async get => {
    const value = get(valueRef).current
    const {
      theme = 'github-light',
      language = 'javascript',
      decorations
    } = get(outputRenderDeps)
    if (!highlighter || value === undefined) return

    const { codeToHtml } = await highlighter
    output.innerHTML = codeToHtml(value, {
      lang: language,
      theme: theme,
      decorations,
      transformers: [
        shikitorStructureTransformer(target, cursorRef.current.line),
        transformerRenderWhitespace()
      ]
    })
  })
  scopeSubscribe(cursorRef, () => {
    const cursor = snapshot(cursorRef).current
    if (cursor.line === undefined) return
    const line = output.querySelector(`[data-line="${cursor.line}"]`)
    if (!line) return

    const oldLine = output.querySelector(`.${HIGHLIGHTED}`)
    if (oldLine === line) return
    if (oldLine) {
      oldLine.classList.remove(HIGHLIGHTED)
    }
    line.classList.add(HIGHLIGHTED)
  })
  return disposeScoped
}
