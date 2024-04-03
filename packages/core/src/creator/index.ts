import './index.scss'

import { getHighlighter } from 'shiki'
import { proxy, subscribe } from 'valtio/vanilla'

import { callUpdateDispatcher, type ResolvedSelection, type Shikitor, type ShikitorOptions } from '../editor'
import type { Popup } from '../editor/register'
import type { _KeyboardEvent, ShikitorPlugin } from '../plugin'
import type { PickByValue } from '../types'
import { classnames } from '../utils/classnames'
import { type DecoratedThemedToken, decorateTokens } from '../utils/decorateTokens'
import { getRawTextHelper } from '../utils/getRawTextHelper'
import { isMultipleKey } from '../utils/isMultipleKey'
import { isWhatBrowser } from '../utils/isWhatBrowser'
import { lazy } from '../utils/lazy'
import { listen } from '../utils/listen'
import { throttle } from '../utils/throttle'

function cssvar(name: string) {
  return `--shikitor-${name}`
}

function initInputAndOutput(options: ShikitorOptions) {
  const input = document.createElement('textarea')
  const output = document.createElement('div')

  input.value = options.value ?? ''
  input.classList.add('shikitor-input')
  input.setAttribute('autocapitalize', 'off')
  input.setAttribute('autocomplete', 'off')
  input.setAttribute('autocorrect', 'off')
  input.setAttribute('spellcheck', 'false')

  output.classList.add('shikitor-output')
  return [input, output] as const
}

async function resolveInputOptions(options: ShikitorOptions) {
  const inputPlugins = options.plugins ?? []
  const waitResolvedPlugins = await Promise.all(inputPlugins.map(Promise.resolve.bind(Promise)))
  return {
    ...options,
    plugins: await Promise.all(
      waitResolvedPlugins
        .map(plugin => typeof plugin === 'function' ? plugin() : plugin)
    )
  }
}

function usePopups() {
  const popups = proxy<Popup[]>([])
  const update = () => {
  }
  subscribe(popups, update)
  return [popups, update] as const
}

export async function create(target: HTMLDivElement, inputOptions: ShikitorOptions): Promise<Shikitor> {
  let options = await resolveInputOptions(inputOptions)
  const shikitorPluginsRef = { get current() { return options.plugins } }
  function callAllShikitorPlugins<
    K extends Exclude<keyof PickByValue<ShikitorPlugin, (...args: any[]) => any>, undefined>
  >(method: K, ...args: Parameters<Exclude<ShikitorPlugin[K], undefined>>) {
    return shikitorPluginsRef.current?.map(ShikitorPlugin => ShikitorPlugin[method]?.call(
      shikitor,
      // @ts-ignore
      ...args
    ))
  }
  const [input, output] = initInputAndOutput(options)
  target.classList.add('shikitor')
  target.innerHTML = ''
  target.append(output, input)

  const renderOptions = () => {
    const {
      readOnly,
      lineNumbers = 'on'
    } = options
    target.classList.toggle('line-numbers', lineNumbers === 'on')
    target.classList.toggle('read-only', readOnly === true)
  }
  const highlighter = lazy((theme: string, language: string) => getHighlighter({ themes: [theme], langs: [language] }))
  const renderOutput = async () => {
    const {
      theme = 'github-light', language = 'javascript',
      decorations = []
    } = options
    const cursor = prevCursor?.line
    const { codeToTokens } = await highlighter(theme, language)

    const codeToHtml = (code: string) => {
      const {
        tokens: tokensLines,
        fg = '',
        bg = '',
        themeName,
        rootStyle = ''
      } = codeToTokens(code, {
        lang: language,
        theme: theme
      })
      target.style.color = fg
      target.style.setProperty(cssvar('fg-color'), fg)
      target.style.setProperty(cssvar('bg-color'), bg)
      target.style.setProperty(cssvar('caret-color'), fg)
      target.style.backgroundColor = bg
      target.style.cssText += rootStyle
      themeName && target.classList.add(themeName)

      const decoratedTokensLines: DecoratedThemedToken[][] = decorations.length > 0
        ? decorateTokens(code, tokensLines, decorations)
        : tokensLines
      const lines = decoratedTokensLines.map((tokenLine, index) => {
        const tokens = tokenLine
          .map(token => `<span
            class="${
            classnames(
              'shikitor-output-token',
              token.tagName,
              `offset:${token.offset}`,
              `position:${index + 1}:${token.offset + 1},${token.offset + 1 + token.content.length}`,
              `font-style:${token.fontStyle}`
            )
          }"
            style="color: ${token.color}">${
            token.content
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
          }</span>`)
          .join('')
        return `<span
          data-line="${index + 1}"
          class="${classnames(
            'shikitor-output-line',
            !!cursor && (
              cursor === index + 1 ? 'shikitor-output-line-cursor' : ''
            )
          )}"
        >${
          tokens.length === 0
            ? '<span class="shikitor-output-line-empty"> </span>'
            : tokens
        }</span>`
      })
      return `<pre tabindex="0"><code class="shikitor-output-lines">${lines.join('')}</code></pre>`
    }
    output.innerHTML = codeToHtml(input.value)
  }
  const getValue = () => input.value
  const setValue = (value: string) => input.value = value
  const changeValue = (value: string) => {
    setValue(value)
    options.value = value
    const getValueResult = getValue()
    options.onChange?.(getValueResult)
    callAllShikitorPlugins('onChange', getValueResult)
    renderOutput()
  }
  let prevOutputHoverElement: Element | null = null
  input.addEventListener('mousemove', throttle(e => {
    input.style.pointerEvents = 'none'
    output.style.pointerEvents = 'auto'
    const outputHoverElement = document.elementFromPoint(e.clientX, e.clientY)
    input.style.pointerEvents = ''
    output.style.pointerEvents = ''
    if (outputHoverElement === prevOutputHoverElement) {
      return
    }
    prevOutputHoverElement = outputHoverElement
    if (outputHoverElement === null) {
      return
    }
    if (
      outputHoverElement.className.includes('shiki-editor')
      && outputHoverElement.className.includes('output')
    ) {
      return
    }

    if (!outputHoverElement?.className.includes('position')) {
      return
    }

    const offsetStr = /offset:(\d+)/
      .exec(outputHoverElement.className)
      ?.[1]
    if (!offsetStr) {
      return
    }
    const offset = Number(offsetStr)
    if (isNaN(offset)) {
      return
    }
    const [line, start, end] = /position:(\d+):(\d+),(\d+)/
      .exec(outputHoverElement.className)
      ?.slice(1)
      ?.map(Number)
    ?? []
    if (!line || !start || !end || [line, start, end].some(isNaN)) {
      return
    }

    callAllShikitorPlugins('onHoverElement', {
      start: { offset, line, character: start },
      end: { offset, line, character: end }
    }, {
      content: input.value.slice(start - 1, end - 1),
      element: outputHoverElement,
      raw: input.value
    })
  }, 50))
  input.addEventListener('input', () => changeValue(input.value))

  let prevCursor = options.cursor
  let prevSelection: ResolvedSelection | undefined
  function updateCursor() {
    const { resolvePosition } = getRawTextHelper(getValue())
    const selection = { start: resolvePosition(input.selectionStart), end: resolvePosition(input.selectionEnd) }
    const offset = selection.start.offset !== prevSelection?.start.offset
      ? selection.start
      : selection.end
    const cursor = resolvePosition(offset)
    if (cursor.offset !== prevCursor?.offset) {
      options.onCursorChange?.(cursor)
      callAllShikitorPlugins('onCursorChange', cursor)
    }
    prevCursor = cursor
    prevSelection = selection
  }
  const offDocumentSelectionChange = listen(document, 'selectionchange', () => {
    if (document.getSelection()?.focusNode === target) {
      updateCursor()
    }
  })
  input.addEventListener('keydown', e => {
    callAllShikitorPlugins('onKeydown', e as _KeyboardEvent)
    if (e.key === 'Escape' && !isMultipleKey(e)) {
      if (input.selectionStart !== input.selectionEnd && prevCursor) {
        e.preventDefault()
        input.setSelectionRange(prevCursor.offset, prevCursor.offset)
      }
    }
    // The Chrome browser never fires a selectionchange event when backspace or delete is pressed.
    // So we need to handle this case separately.
    // https://issues.chromium.org/41321247
    // https://issues.chromium.org/41399759
    if (isWhatBrowser('chrome')) {
      if (['Backspace', 'Delete', 'Enter'].includes(e.key) && !isMultipleKey(e)) {
        const s = { start: input.selectionStart, end: input.selectionEnd }
        setTimeout(() => {
          if (s.start !== input.selectionStart || s.end !== input.selectionEnd) {
            input.setSelectionRange(input.selectionStart, input.selectionEnd)
            document.dispatchEvent(new Event('selectionchange'))
          }
        }, 10)
      }
    }
  })
  input.addEventListener('keyup', callAllShikitorPlugins.bind(null, 'onKeyup'))
  input.addEventListener('keypress', callAllShikitorPlugins.bind(null, 'onKeypress'))
  input.addEventListener('scroll', () => {
    output.scrollTop = input.scrollTop
    output.scrollLeft = input.scrollLeft
  })

  renderOptions()
  renderOutput()
  const shikitor: Shikitor = {
    get value() {
      return getValue()
    },
    set value(value: string) {
      changeValue(value)
    },
    get options() {
      return options
    },
    set options(newOptions) {
      this.updateOptions(newOptions)
    },
    async updateOptions(newOptions) {
      options = await resolveInputOptions(callUpdateDispatcher(newOptions, options) ?? {})
      options.value && setValue(options.value)
      renderOptions()
      renderOutput()
    },
    get language() {
      return options.language
    },
    set language(language) {
      options.language = language
      renderOutput()
    },
    updateLanguage(language) {
      this.language = callUpdateDispatcher(language, options.language)
    },
    get cursor() {
      if (prevCursor === undefined) {
        updateCursor()
      }
      return prevCursor!
    },
    focus(cursor) {
      const { resolvePosition } = getRawTextHelper(getValue())
      const resolvedStartPos = resolvePosition(cursor ?? prevCursor?.offset ?? 0)
      input.setSelectionRange(
        resolvedStartPos.offset, resolvedStartPos.offset
      )
      input.focus()
    },
    get selections() {
      if (prevSelection === undefined) {
        updateCursor()
      }
      return [prevSelection!]
    },
    get rawTextHelper() {
      // TODO lazy and function proxy
      return getRawTextHelper(getValue())
    },
    updateSelection(index, selectionOrGetSelection) {
      const { selections } = this
      if (index < 0 || index >= selections.length) {
        return
      }
      const selectionT0 = selections[index]
      const selectionT1 = callUpdateDispatcher(selectionOrGetSelection, selectionT0)
      if (selectionT1 === undefined) {
        return
      }

      const { resolvePosition } = getRawTextHelper(getValue())
      const prevResolvedPrevSelection = {
        start: resolvePosition(selectionT0.start),
        end: resolvePosition(selectionT0.end)
      }
      const resolvedSelection = {
        start: resolvePosition(selectionT1.start),
        end: resolvePosition(selectionT1.end)
      }
      if ([
        prevResolvedPrevSelection.start.offset !== resolvedSelection.start.offset,
        prevResolvedPrevSelection.end.offset !== resolvedSelection.end.offset
      ].some(Boolean)) {
        // TODO
        // options.onSelectionChange?.(selection)
        // callAllShikitorPlugins('onSelectionChange', selection)
        prevSelection = resolvedSelection
      }
      input.setSelectionRange(resolvedSelection.start.offset, resolvedSelection.end.offset)
    },
    async upsertPlugin(plugin, index) {
      const p = await Promise.resolve(typeof plugin === 'function' ? plugin() : plugin)
      if (p === undefined) {
        return
      }
      if (index === undefined) {
        options.plugins?.push(p)
      } else {
        options.plugins?.splice(index, 1, p)
      }
      p.install?.call(this, this)
      renderOutput()
    },
    dispose() {
      offDocumentSelectionChange()
      target.innerHTML = ''
      options.onDispose?.()
      callAllShikitorPlugins('onDispose')
    },
    registerPopupProvider(language, provider) {
      if (provider.position === 'relative') {
        throw new Error('Not implemented')
      }
      if (provider.position === 'absolute') {
        return {
          dispose() {}
        }
      }
      throw new Error('Not implemented')
    }
  }
  callAllShikitorPlugins('install', shikitor)
  return shikitor
}
