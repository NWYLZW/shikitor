import { transformerRenderWhitespace } from '@shikijs/transformers'
import { getHighlighter } from 'shiki'
import { derive } from 'valtio/utils'
import { snapshot } from 'valtio/vanilla'

import type { RefObject } from '../../base'
import type { ResolvedCursor, ShikitorOptions } from '../../editor'
import { classnames } from '../../utils'
import { scoped } from '../../utils/valtio/scoped'
import { HIGHLIGHTED } from '../classes'
import { shikitorStructureTransformer } from '../structureTransfomer'

export function outputRenderControlled(
  { target, lines, output }: {
    target: HTMLElement
    lines: HTMLElement
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
        shikitorStructureTransformer(target),
        transformerRenderWhitespace()
      ]
    })
    let lineCounts = 1
    for (let i = 0; i < value.length; i++) {
      if (value[i] === '\n') lineCounts++
    }

    const gutterLinePrefix = `${'shikitor'}-gutter-line`
    const cursorLine = cursorRef.current.line
    const lineClass = (index: number) => {
      const isCursor = !!cursorLine && cursorLine === index
      return classnames(
        gutterLinePrefix,
        {
          [HIGHLIGHTED]: isCursor
        }
      )
    }
    lines.style.width = `${lineCounts.toString().length}ch`
    lines.innerHTML = Array
      .from({ length: lineCounts })
      .map((_, i) => (`<div class="${lineClass(i + 1)}" data-line="${i + 1}">
        <div class="${gutterLinePrefix}-number">${i + 1}</div>
      </div>`))
      .join('')
  })
  scopeSubscribe(cursorRef, () => {
    const cursor = snapshot(cursorRef).current
    if (cursor.line === undefined) return
    const line = lines.querySelector(`[data-line="${cursor.line}"]`)
    if (!line) return

    const oldLine = lines.querySelector(`.${HIGHLIGHTED}`)
    if (oldLine === line) return
    if (oldLine) {
      oldLine.classList.remove(HIGHLIGHTED)
    }
    line.classList.add(HIGHLIGHTED)
  })
  return disposeScoped
}
