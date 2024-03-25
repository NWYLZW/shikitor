import './index.scss'

import type { ResolvedPosition } from '@shikijs/core'
import { getHighlighter } from 'shiki'

import { callUpdateDispatcher, type Shikitor, type ShikitorOptions } from '../core/editor'
import type { IDisposable, LanguageSelector } from '../core/editor/base'
import type { Popup, PopupProvider } from '../core/editor/register'
import type { _KeyboardEvent, ShikitorPlugin } from '../core/plugin'
import type { PickByValue } from '../types'
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
  return {
    ...options,
    plugins: await Promise.all(
      (
        await Promise.all(options.plugins ?? [])
      ).map(plugin => typeof plugin === 'function' ? plugin() : plugin)
    )
  }
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
      const lines = decoratedTokensLines.map((tokenLine, index) => (`<span class="shikitor-output-line" data-line="${index + 1}">${
				tokenLine
					.map(token => `<span
            class="${
              (token.tagName ? `${token.tagName} ` : '') +
              `offset:${token.offset} ` +
              `position:${index + 1}:${token.offset + 1},${token.offset + 1 + token.content.length} ` +
              `font-style:${token.fontStyle}`
            }"
            style="color: ${token.color}">${token.content}</span>`)
					.join('')
			}</span>`))
      return `<pre tabindex="0"><code>${lines.join('<br>')}</code></pre>`
    }
    output.innerHTML = codeToHtml(input.value)
  }
  const popups: Popup[] = []
  const renderPopups = async () => {
  }
  const getValue = () => input.value
  const setValue = (value: string) => input.value = value
  const changeValue = (value: string) => {
    setValue(value)
    options.value = value
    options.onChange?.(getValue())
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

  let prevCursor: ResolvedPosition = options.cursor ?? { offset: 0, line: 0, character: 0 }
  input.addEventListener('input', () => changeValue(input.value))
  const prevSelection = { start: 0, end: 0 }
  function updateCursor() {
    const selection = { start: input.selectionStart, end: input.selectionEnd }
    const offset = selection.start !== prevSelection.start
      ? selection.start
      : selection.end
    const rawTextHelper = getRawTextHelper(getValue())
    const cursor = rawTextHelper.getResolvedPositions(offset)
    if (cursor.offset !== prevCursor.offset) {
      options.onCursorChange?.(cursor)
      callAllShikitorPlugins('onCursorChange', cursor)
    }
    prevCursor = cursor
    prevSelection.start = selection.start
    prevSelection.end = selection.end
  }
  let resetCursorLock = false
  const offDocumentSelectionChange = listen(document, 'selectionchange', () => {
    if (resetCursorLock) {
      resetCursorLock = false
      return
    }
    if (document.getSelection()?.focusNode === target) {
      updateCursor()
    }
  })
  input.addEventListener('keydown', e => {
    callAllShikitorPlugins('onKeydown', e as _KeyboardEvent)
    if (e.key === 'Escape' && !isMultipleKey(e)) {
      if (input.selectionStart !== input.selectionEnd) {
        e.preventDefault()
        input.setSelectionRange(prevCursor.offset, prevCursor.offset)
      }
    }
    // The Chrome browser never fires a selectionchange event when backspace or delete is pressed.
    // So we need to handle this case separately.
    // https://issues.chromium.org/41321247
    // https://issues.chromium.org/41399759
    if (isWhatBrowser('chrome') && (e.key === 'Backspace' || e.key === 'Delete') && !isMultipleKey(e)) {
      const s = { start: input.selectionStart, end: input.selectionEnd }
      setTimeout(() => {
        if (s.start !== input.selectionStart || s.end !== input.selectionEnd) {
          input.setSelectionRange(input.selectionStart, input.selectionEnd)
          document.dispatchEvent(new Event('selectionchange'))
        }
      }, 10)
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
    set options(newOptions: ShikitorOptions) {
      resolveInputOptions(newOptions)
        .then(newOptions => {
          options = newOptions
          options.value && setValue(options.value)
          renderOptions()
          renderOutput()
        })
    },
    updateOptions(newOptions) {
      shikitor.options = Object.assign(options, callUpdateDispatcher(newOptions, options) ?? {})
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
    focus({ start, end } = {}) {
      const { getResolvedPositions } = getRawTextHelper(getValue())
      const resolvedStartPos = getResolvedPositions(start ?? 0)
      input.setSelectionRange(
        resolvedStartPos.offset,
        end === undefined
          ? resolvedStartPos.offset
          : getResolvedPositions(end).offset
      )
      resetCursorLock = true
      input.focus()
    },
    dispose() {
      offDocumentSelectionChange()
      target.innerHTML = ''
      options.onDispose?.()
      callAllShikitorPlugins('onDispose')
    },
    registerPopupProvider(language: LanguageSelector, provider: PopupProvider): IDisposable {
      if (provider.position === 'relative') {
        if (provider.target === 'cursor') {
          return { dispose() {} }
        }
      }
      if (provider.position === 'absolute') {
      }
      throw new Error('Not implemented')
    }
  }
  callAllShikitorPlugins('install', shikitor)
  return shikitor
}
