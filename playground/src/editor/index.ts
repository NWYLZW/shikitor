import './index.scss'

import { type BundledLanguage, type BundledTheme, getHighlighter } from 'shiki'
import type { PickByValue } from '../types'
import { throttle } from '../utils'

export interface TextRange {
  offset: number
  line: number
  start: number
  end: number
}
export interface OnHoverElementContext {
  content: string
  element: Element
  raw: string
}

export interface Plugin {
  name?: string
  install?: (editor: Shikitor) => void
  onDispose?: () => void
  onHoverElement?: (range: TextRange, context: OnHoverElementContext) => void
}

export interface ShikitorEvents {
  onChange?: (value: string) => void
  onDispose?: () => void
}

export interface ShikitorOptions extends ShikitorEvents {
  value?: string
  language?: BundledLanguage
  lineNumbers?: "on" | "off"
  readOnly?: boolean
  theme?: BundledTheme
  plugins?: Plugin[]
}

export interface Shikitor {
  value: string
  options: Readonly<ShikitorOptions>
  dispose: () => void
}

function initInputAndOutput(options: ShikitorOptions) {
  const input = document.createElement('textarea')
  const output = document.createElement('div')

  input.value = options.value ?? ''
  input.classList.add('shikitor-input')
  input.setAttribute("autocapitalize", "off")
  input.setAttribute("autocomplete", "off")
  input.setAttribute("autocorrect", "off")
  input.setAttribute("spellcheck", "false")

  output.classList.add('shikitor-output')
  return [input, output] as const
}

export function create(target: HTMLDivElement, options: ShikitorOptions): Shikitor {
  let pluginsRef = { get current() { return options.plugins } }
  function callAllPlugins<
    K extends Exclude<keyof PickByValue<Plugin, (...args: any[]) => any>, undefined>
  >(method: K, ...args: Parameters<Exclude<Plugin[K], undefined>>) {
    return pluginsRef.current?.map(plugin => plugin[method]?.(
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
    if (lineNumbers === 'on') {
      target.classList.add('line-numbers')
    } else {
      target.classList.remove('line-numbers')
    }
    if (readOnly) {
      target.classList.add('read-only')
    } else {
      target.classList.remove('read-only')
    }
  }
  const renderOutput = async () => {
    const {
      theme = 'github-light', language = 'javascript'
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
      target.style.setProperty("--caret-color", fg)
      target.style.backgroundColor = bg
      target.style.cssText += rootStyle
      themeName && target.classList.add(themeName)

      const lines = tokensLines.map((tokenLine, index) => (`<span class="shikitor-output-line" data-line="${index + 1}">${
				tokenLine
					.map(token => `<span class="${
						`offset:${token.offset} ` +
						`position:${index + 1}:${token.offset + 1},${token.offset + 1 + token.content.length} ` +
						`font-style:${token.fontStyle}`
					}" style="color: ${token.color}">${token.content}</span>`)
					.join("")
			}</span>`))
      return `<pre tabindex="0"><code>${lines}</code></pre>`
    }
    output.innerHTML = codeToHtml(input.value)
  }

  const getValue = () => input.value
  const setValue = (value: string) => input.value = value
  const changeValue = (value: string) => {
    setValue(value)
    options.onChange?.(getValue())
    renderOutput()
  }
  input.addEventListener('input', () => changeValue(input.value))
  let prevOutputHoverElement: Element | null = null
  input.addEventListener("mousemove", throttle(e => {
    input.style.pointerEvents = "none"
    output.style.pointerEvents = "auto"
    const outputHoverElement = document.elementFromPoint(e.clientX, e.clientY)
    input.style.pointerEvents = ""
    output.style.pointerEvents = ""
    if (outputHoverElement === prevOutputHoverElement) {
      return
    }
    prevOutputHoverElement = outputHoverElement
    if (outputHoverElement === null) {
      return
    }
    if (
      outputHoverElement.className.includes("shiki-editor")
      && outputHoverElement.className.includes("output")
    ) {
      return
    }

    if (!outputHoverElement?.className.includes("position")) {
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

    callAllPlugins('onHoverElement', { offset, line: line, start: start, end: end }, {
      content: input.value.slice(start - 1, end - 1),
      element: outputHoverElement,
      raw: input.value,
    })
  }, 50))

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
      Object.assign(options, newOptions)
      options.value && setValue(options.value)
      renderOptions()
      renderOutput()
    },
    dispose() {
      options.onDispose?.()
      callAllPlugins('onDispose')
    }
  }
  callAllPlugins('install', shikitor)
  return shikitor
}
