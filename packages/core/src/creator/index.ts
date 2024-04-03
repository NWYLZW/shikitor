import './index.scss'

import { getHighlighter } from 'shiki'
import { derive, watch } from 'valtio/utils'
import { proxy, snapshot, subscribe } from 'valtio/vanilla'

import type {
  Cursor,
  ResolvedCursor,
  ResolvedSelection,
  Shikitor,
  ShikitorOptions
} from '../editor'
import { callUpdateDispatcher } from '../editor'
import type { Popup } from '../editor/register'
import type { _KeyboardEvent, ShikitorPlugin } from '../plugin'
import type { PickByValue } from '../types'
import { classnames } from '../utils/classnames'
import { debounce } from '../utils/debounce'
import { getRawTextHelper, type RawTextHelper } from '../utils/getRawTextHelper'
import { isMultipleKey } from '../utils/isMultipleKey'
import { isWhatBrowser } from '../utils/isWhatBrowser'
import { listen } from '../utils/listen'
import { throttle } from '../utils/throttle'

interface RefObject<T> {
  current: T
}

type WatchParams = Parameters<typeof watch>
type WatchCallback = WatchParams[0]
type WatchOptions = WatchParams[1] & {
  timeout?: number
}
function debounceWatch(
  callback: WatchCallback,
  { timeout = 5, ...options }: WatchOptions = {}
) {
  return watch(debounce(callback, timeout), options)
}

function cssvar(name: string) {
  return `--shikitor-${name}`
}

function initInputAndOutput() {
  const input = document.createElement('textarea')
  const output = document.createElement('div')

  input.classList.add('shikitor-input')
  input.setAttribute('autocapitalize', 'off')
  input.setAttribute('autocomplete', 'off')
  input.setAttribute('autocorrect', 'off')
  input.setAttribute('spellcheck', 'false')

  output.classList.add('shikitor-output')
  return [input, output] as const
}

async function resolveInputPlugins(plugins: ShikitorOptions['plugins']) {
  const waitResolvedPlugins = await Promise.all(plugins?.map(Promise.resolve.bind(Promise)) ?? [])
  return Promise.all(
    waitResolvedPlugins
      .map(plugin => typeof plugin === 'function' ? plugin() : plugin)
  )
}

function usePopups() {
  const popups = proxy<Popup[]>([])
  const render = () => {
  }
  return {
    render, off: subscribe(popups, render)
  }
}

// TODO use using refactor this
function valueControlled(
  input: HTMLTextAreaElement,
  ref: RefObject<{ value?: string }>,
  onChange: ((value: string) => void) | undefined
) {
  const valueRef = derive({
    current: get => get(ref).current.value ?? ''
  })
  const unSub = subscribe(valueRef, () => {
    const value = valueRef.current
    if (value !== input.value) {
      input.value = value
    }
    onChange?.(value)
  })
  const rawTextHelperRef = derive({
    current: get => getRawTextHelper(get(valueRef).current)
  })
  const off = listen(input, 'input', () => ref.current.value = input.value)
  input.value = valueRef.current
  return {
    dispose() {
      unSub()
      off()
    },
    valueRef,
    rawTextHelperRef
  }
}

function cursorControlled(
  rthRef: RefObject<RawTextHelper>,
  ref: RefObject<{ cursor?: Cursor }>,
  onCursorChange: (cursor: ResolvedCursor) => void
) {
  const optionsCursorRef = derive({
    current: get => get(ref).current.cursor
  })
  const cursorRef = derive({
    current: get => {
      const { resolvePosition } = get(rthRef).current
      return resolvePosition(get(optionsCursorRef).current ?? 0)
    }
  })
  const dispose = subscribe(cursorRef, () => {
    const cursor = cursorRef.current
    if (cursor === undefined) return
    onCursorChange(cursor)
  })
  return { cursorRef, dispose }
}

export async function create(target: HTMLDivElement, inputOptions: ShikitorOptions): Promise<Shikitor> {
  const {
    onChange,
    onCursorChange,
    onDispose
  } = inputOptions
  const [input, output] = initInputAndOutput()
  target.classList.add('shikitor')
  target.innerHTML = ''
  target.append(output, input)

  const optionsRef = proxy({
    current: {
      ...inputOptions,
      plugins: await resolveInputPlugins(inputOptions.plugins)
    }
  })

  const pluginsRef = derive({
    current: get => get(optionsRef).current.plugins
  })
  async function callAllShikitorPlugins<
    K extends Exclude<keyof PickByValue<ShikitorPlugin, (...args: any[]) => any>, undefined>
  >(method: K, ...args: Parameters<Exclude<ShikitorPlugin[K], undefined>>) {
    const plugins = await pluginsRef.current
    return plugins.map(ShikitorPlugin => ShikitorPlugin[method]?.call(
      shikitor,
      // @ts-ignore
      ...args
    ))
  }

  const {
    dispose: disposeValueControlled,
    valueRef,
    rawTextHelperRef
  } = valueControlled(input, optionsRef, value => {
    onChange?.(value)
    callAllShikitorPlugins('onChange', value)
  })
  const {
    dispose: disposeCursorControlled,
    cursorRef
  } = cursorControlled(
    rawTextHelperRef,
    optionsRef,
    cursor => {
      onCursorChange?.(cursor)
      callAllShikitorPlugins('onCursorChange', cursor)
    }
  )

  const dispose = () => {
    disposeValueControlled()
    disposeCursorControlled()
    onDispose?.()
    callAllShikitorPlugins('onDispose')
  }

  let prevSelection: ResolvedSelection | undefined

  watch(get => {
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
  watch(async get => {
    const {
      theme = 'github-light',
      language = 'javascript'
    } = get(highlighterDeps)
    highlighter = getHighlighter({ themes: [theme], langs: [language] })
  })
  const outputRenderDeps = derive({
    value: get => get(valueRef).current,
    cursor: get => get(cursorRef).current,
    theme: get => get(optionsRef).current.theme,
    language: get => get(optionsRef).current.language,
    decorations: get => get(optionsRef).current.decorations
  })
  debounceWatch(async get => {
    const {
      value,
      cursor,
      theme = 'github-light',
      language = 'javascript',
      decorations
    } = get(outputRenderDeps)
    if (!highlighter || value === undefined) return

    const cursorLine = cursor?.line
    const { codeToHtml } = await highlighter
    output.innerHTML = codeToHtml(value, {
      lang: language,
      theme: theme,
      decorations,
      transformers: [
        {
          name: 'shikitor',
          pre(ele) {
            const div = document.createElement('div')
            div.style.cssText = (ele.properties.style as string | undefined) ?? ''
            const bg = div.style.backgroundColor
            const fg = div.style.color
            target.style.setProperty(cssvar('fg-color'), fg)
            target.style.setProperty(cssvar('bg-color'), bg)
            target.style.setProperty(cssvar('caret-color'), fg)
            target.style.color = fg
            target.style.backgroundColor = bg
            target.style.cssText += ele.properties.style
          },
          code(ele) {
            const props = ele.properties as {
              class?: string
            }
            props.class = classnames(props.class, 'shikitor-output-lines')
          },
          line(ele, line) {
            const props = ele.properties as {
              'data-line'?: string
              class?: string
            }
            const isCursor = !!cursorLine && cursorLine === line
            props.class = classnames(
              props.class,
              'shikitor-output-line',
              isCursor && 'shikitor-output-line-highlighted'
            )
            props['data-line'] = String(line)
            if (isCursor && ele.children.length === 0) {
              ele.children.push({ type: 'text', value: ' ' })
            }
          },
          span(ele, line, col) {
            const props = ele.properties as {
              class?: string
              style?: string
            }
            props.class = classnames(
              props.class,
              'shikitor-output-token',
              `offset:${col}`,
              `position:${line + 1}:${col + 1}`
            )
          }
        }
      ]
    })
  })
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

  function updateCursor() {
    const { resolvePosition } = shikitor.rawTextHelper
    const selection = { start: resolvePosition(input.selectionStart), end: resolvePosition(input.selectionEnd) }
    const pos = selection.start.offset !== prevSelection?.start.offset
      ? selection.start
      : selection.end
    if (optionsRef.current.cursor?.offset !== pos.offset) {
      optionsRef.current.cursor = resolvePosition(pos)
    }
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
      const cursor = cursorRef.current
      if (input.selectionStart !== input.selectionEnd && cursor) {
        e.preventDefault()
        input.setSelectionRange(cursor.offset, cursor.offset)
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

  const shikitor: Shikitor = {
    get value() {
      return valueRef.current
    },
    set value(value) {
      optionsRef.current.value = value
    },
    get options() {
      return {
        ...snapshot(optionsRef).current,
        value: snapshot(valueRef).current,
        cursor: snapshot(cursorRef).current
      }
    },
    set options(newOptions) {
      this.updateOptions(newOptions)
    },
    async updateOptions(newOptions) {
      const {
        cursor,
        plugins,
        ...resolvedOptions
      } = callUpdateDispatcher(newOptions, this.options) ?? {}
      let newCursor = optionsRef.current.cursor
      if (cursor?.offset !== newCursor?.offset) {
        newCursor = cursor
      }
      optionsRef.current = {
        ...resolvedOptions,
        cursor: newCursor,
        plugins: await resolveInputPlugins(plugins ?? [])
      }
    },
    get language() {
      return this.options.language
    },
    set language(language) {
      this.updateLanguage(language)
    },
    updateLanguage(language) {
      const newLanguage = callUpdateDispatcher(language, this.language)
      if (newLanguage === undefined) {
        return
      }
      optionsRef.current.language = newLanguage
    },
    get cursor() {
      return cursorRef.current!
    },
    focus(cursor) {
      const { resolvePosition } = this.rawTextHelper
      const resolvedStartPos = resolvePosition(cursor ?? 0)
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
      return rawTextHelperRef.current
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

      const { resolvePosition } = this.rawTextHelper
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
      const plugins = pluginsRef.current
      if (index === undefined) {
        plugins?.push(p)
      } else {
        plugins?.splice(index, 1, p)
      }
      p.install?.call(this, this)
    },
    dispose() {
      offDocumentSelectionChange()
      target.innerHTML = ''
      dispose()
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
