import './index.scss'

import { type BundledLanguage, type BundledTheme, getHighlighter } from 'shiki'

export interface ShikitorOptions {
  value?: string
  onChange?: (value: string) => void
  language?: BundledLanguage
  lineNumbers?: "on" | "off"
  readOnly?: boolean
  theme?: BundledTheme
}

export interface Shikitor {
  value: string
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
  const {
    theme = 'github-light',
    language = 'javascript',
    readOnly,
    lineNumbers = 'on',
    value, onChange
  } = options

  const [input, output] = initInputAndOutput(options)
  target.append(output, input)
  target.classList.add('shikitor')
  if (lineNumbers === 'on') {
    target.classList.add('line-numbers')
  }
  if (readOnly) {
    target.classList.add('read-only')
  }

  const highlighter = getHighlighter({ themes: [theme], langs: [language] })
  const render = async () => {
    const { codeToTokens } = await highlighter

    const codeToHtml = (code: string) => {
      const {
        tokens: tokensLines,
        fg = '',
        bg = '',
        themeName,
        rootStyle = ''
      } = codeToTokens(code, {
        lang: "javascript",
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
  const changeValue = (value: string) => {
    input.value = value
    onChange?.(getValue())
    render()
  }
  input.addEventListener('input', () => changeValue(input.value))

  render()
  return {
    get value() {
      return input.value
    },
    set value(value: string) {
      changeValue(value)
    }
  }
}
