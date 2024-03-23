import './index.scss'

import type { DecorationItem, ResolvedPosition } from '@shikijs/core'
import type { BundledLanguage, BundledTheme } from 'shiki'
import { getHighlighter } from 'shiki'

import type { PickByValue } from '../types'
import { type DecoratedThemedToken, decorateTokens, getRawTextHelper, throttle } from '../utils'

export interface TextRange {
  start: ResolvedPosition
  end: ResolvedPosition
}
export interface OnHoverElementContext {
  content: string
  element: Element
  raw: string
}

export interface Plugin {
  name?: string
  install?: (this: Shikitor, editor: Shikitor) => void
  onDispose?: (this: Shikitor) => void
  onCursorChange?: (this: Shikitor, cursor: ResolvedPosition) => void
  onHoverElement?: (this: Shikitor, range: TextRange, context: OnHoverElementContext) => void
}

export function definePlugin(plugin: Plugin) {
  return plugin
}

export interface ShikitorEvents {
  onChange?: (value: string) => void
  onDispose?: () => void
}

export interface ShikitorOptions extends ShikitorEvents {
  value?: string
  language?: BundledLanguage
  lineNumbers?: 'on' | 'off'
  readOnly?: boolean
  theme?: BundledTheme
  decorations?: Pick<DecorationItem, 'start' | 'end' | 'tagName'>[]
  plugins?: Plugin[]
}

export interface Shikitor {
  value: string
  options: Readonly<ShikitorOptions>
  updateOptions: (options: ShikitorOptions | ((options: ShikitorOptions) => ShikitorOptions)) => void
  dispose: () => void
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

export function create(target: HTMLDivElement, inputOptions: ShikitorOptions): Shikitor {
  let options = { ...inputOptions }
  const pluginsRef = { get current() { return options.plugins } }
  function callAllPlugins<
    K extends Exclude<keyof PickByValue<Plugin, (...args: any[]) => any>, undefined>
  >(method: K, ...args: Parameters<Exclude<Plugin[K], undefined>>) {
    return pluginsRef.current?.map(plugin => plugin[method]?.call(
      shikitor,
      // @ts-ignore
      ...args
    ))
  }
  const [input, output] = initInputAndOutput(options)
  target.classList.add('shikitor')
  target.append(output, input)

  const renderOptions = () => {
    const {
      readOnly,
      lineNumbers = 'on'
    } = options
    target.classList.toggle('line-numbers', lineNumbers === 'on')
    target.classList.toggle('read-only', readOnly === true)
  }
  const renderOutput = async () => {
    const {
      theme = 'github-light', language = 'javascript',
      decorations = []
    } = options
    const { codeToTokens } = await getHighlighter({ themes: [theme], langs: [language] })

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
      target.style.setProperty('--caret-color', fg)
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

    callAllPlugins('onHoverElement', {
      start: { offset, line, character: start },
      end: { offset, line, character: end }
    }, {
      content: input.value.slice(start - 1, end - 1),
      element: outputHoverElement,
      raw: input.value
    })
  }, 50))

  let prevCursor: ResolvedPosition = { offset: 0, line: 0, character: 0 }
  input.addEventListener('input', () => changeValue(input.value))
  function updateCursor(offset: number = input.selectionStart) {
    const rawTextHelper = getRawTextHelper(getValue())
    const cursor = rawTextHelper.getResolvedPositions(offset)
    if (cursor.offset !== prevCursor.offset) {
      callAllPlugins('onCursorChange', cursor)
    }
    prevCursor = cursor
  }
  input.addEventListener('click', () => updateCursor())
  input.addEventListener('keydown', () => {
    // TODO throttle cursor update
    setTimeout(updateCursor, 10)
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
      options = newOptions
      options.value && setValue(options.value)
      renderOptions()
      renderOutput()
    },
    updateOptions(newOptions) {
      shikitor.options = typeof newOptions === 'function'
        ? newOptions(options)
        : Object.assign(options, newOptions)
    },
    dispose() {
      options.onDispose?.()
      callAllPlugins('onDispose')
    }
  }
  callAllPlugins('install', shikitor)
  return shikitor
}
