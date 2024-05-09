import './index.scss'

import { derive } from 'valtio/utils'
import { proxy, snapshot } from 'valtio/vanilla'

import type { ResolvedSelection, Shikitor, ShikitorBase, ShikitorInternal, ShikitorOptions } from '../editor'
import { EventEmitter } from '../editor/base.eventEmitter'
import type { _KeyboardEvent } from '../plugin'
import { callUpdateDispatcher, completeAssign, isMultipleKey, isWhatBrowser, listen } from '../utils' with {
  'unbundled-reexport': 'on'
}
import { calcTextareaHeight } from '../utils/calcTextareaHeight'
import { scoped } from '../utils/valtio/scoped'
import { cursorControlled } from './controlled/cursorControlled'
import { extendControlled } from './controlled/extendControlled'
import { outputRenderControlled } from './controlled/outputRenderControlled'
import { pluginsControlled } from './controlled/pluginsControlled'
import { valueControlled } from './controlled/valueControlled'
import { resolveInputPlugins } from './resolveInputPlugins'

function initDom(target: HTMLElement) {
  target.classList.add('shikitor')
  target.innerHTML = ''

  const input = document.createElement('textarea')
  const output = document.createElement('div')
  const placeholder = document.createElement('div')

  input.classList.add('shikitor-input')
  input.setAttribute('autocapitalize', 'off')
  input.setAttribute('autocomplete', 'off')
  input.setAttribute('autocorrect', 'off')
  input.setAttribute('spellcheck', 'false')

  output.classList.add('shikitor-output')
  input.addEventListener('scroll', () => {
    setTimeout(() => {
      // wait the output renders, whether not wait it, the scrollTop can't be set
      output.scrollTop = input.scrollTop
      output.scrollLeft = input.scrollLeft
    }, 10)
  })
  input.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !isMultipleKey(e)) {
      if (input.selectionStart !== input.selectionEnd) {
        e.preventDefault()
        input.setSelectionRange(input.selectionStart, input.selectionStart)
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

  placeholder.classList.add('shikitor-placeholder')
  target.append(output, placeholder, input)
  return [input, output, placeholder] as const
}

export interface CreateOptions {
  abort?: AbortSignal
}

export async function create(
  target: HTMLElement,
  inputOptions: ShikitorOptions = {},
  options: CreateOptions = {}
): Promise<Shikitor> {
  const ee = new EventEmitter()
  const {
    onChange,
    onCursorChange,
    onDispose
  } = inputOptions
  const {
    abort
  } = options

  const disposes: (() => void)[] = []
  const { disposeScoped, scopeWatch } = scoped()

  const dispose = () => {
    disposeScoped()
    disposes.forEach(dispose => dispose())
    onDispose?.()
    try {
      // plugins may not installed
      callAllShikitorPlugins('onDispose')
    } catch { /* empty */ }
  }
  const checkAborted = () => {
    if (abort?.aborted) {
      dispose()
      throw new Error('Aborted')
    }
  }
  await new Promise(resolve => setTimeout(resolve, 0))
  checkAborted()

  const [input, output, placeholder] = initDom(target)

  const optionsRef = proxy({
    current: {
      ...inputOptions,
      plugins: await resolveInputPlugins(inputOptions.plugins)
    }
  })
  checkAborted()

  const {
    dispose: disposeValueControlled,
    valueRef,
    rawTextHelperRef
  } = valueControlled(input, optionsRef, value => {
    onChange?.(value)
    ee.emit('change', value)
    callAllShikitorPlugins('onChange', value)
  })
  disposes.push(disposeValueControlled)
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
  disposes.push(disposeCursorControlled)
  const {
    dispose: disposePluginsControlled,
    install: installAllPlugins,
    shikitorSupportPlugin,
    callAllShikitorPlugins
  } = pluginsControlled(optionsRef, ee)
  disposes.push(disposePluginsControlled)
  const {
    shikitorSupportExtend
  } = extendControlled(ee)

  const autoSizeRef = derive({
    minRows: get => {
      const inputAutoSize = get(optionsRef).current.autoSize
      if (!inputAutoSize) return
      return inputAutoSize === true ? 1 : Math.max(1, inputAutoSize.minRows ?? 1)
    },
    maxRows: get => {
      const inputAutoSize = get(optionsRef).current.autoSize
      if (!inputAutoSize) return
      return inputAutoSize === true ? 5 : Math.max(1, inputAutoSize.maxRows ?? 5)
    },
    enabled: get => {
      const inputAutoSize = get(optionsRef).current.autoSize
      return inputAutoSize !== false
    }
  })
  scopeWatch(get => {
    // noinspection BadExpressionStatementJS
    get(valueRef).current
    const { enabled, minRows, maxRows } = get(autoSizeRef)
    if (!enabled || !minRows || !maxRows) return

    const { height, minHeight } = calcTextareaHeight(input, minRows, maxRows)
    height && (target.style.height = height)
    minHeight && (target.style.minHeight = minHeight)
  })

  const placeholderRef = derive({
    current: get => get(optionsRef).current.placeholder
  })
  scopeWatch(get => {
    const text = get(placeholderRef).current
    const value = get(valueRef).current
    if (text) {
      if (value.length === 0) {
        placeholder.innerText = text
      } else {
        placeholder.innerText = ''
      }
    }
  })

  let prevSelection: ResolvedSelection | undefined
  disposes.push(listen(document, 'selectionchange', () => {
    if (document.getSelection()?.focusNode === target) {
      const { resolvePosition } = shikitor.rawTextHelper
      const [start, end] = [input.selectionStart, input.selectionEnd]
      const selection = { start: resolvePosition(start), end: resolvePosition(end) }
      const pos = selection.start.offset !== prevSelection?.start.offset
        ? selection.start
        : selection.end
      if (optionsRef.current.cursor?.offset !== pos.offset) {
        optionsRef.current.cursor = resolvePosition(pos)
      }
      prevSelection = selection
      return
    }
  }))

  disposes.push(outputRenderControlled(
    { target, output },
    { valueRef, cursorRef, optionsRef }
  ))

  const shikitorInternal: ShikitorInternal = {
    ee,
    _getCursorAbsolutePosition(cursor, lineOffset = 0): { x: number; y: number } {
      const { rawTextHelper: { line } } = this
      const span = document.createElement('span')
      span.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        white-space: pre-wrap;
        word-wrap: break-word;
        overflow-wrap: break-word;
      `
      const style = getComputedStyle(input)
      ;['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'textTransform', 'letterSpacing'].forEach(
        prop => {
          // @ts-ignore
          span.style[prop] = style[prop]
        }
      )
      const reallyLine = cursor.line + lineOffset - 1
      const computedLine = Math.max(reallyLine, 0)
      const text = '\n'.repeat(computedLine) + line(cursor).substring(0, cursor.character)
      const inTheLineStart = cursor.character === 0
      span.textContent = inTheLineStart ? text + ' ' : text
      document.body.appendChild(span)
      const rect = span.getBoundingClientRect()
      document.body.removeChild(span)
      const inputStyle = getComputedStyle(input)
      const left = parseInt(inputStyle.marginLeft) + parseInt(inputStyle.paddingLeft)
      const top = parseInt(inputStyle.marginTop) + parseInt(inputStyle.paddingTop)
      return {
        x: (
          inTheLineStart ? 0 : rect.right
        ) + left,
        y: (
          reallyLine === -1 ? 0 : rect.bottom
        ) + top
      }
    }
  }
  const shikitorDisposable: Disposable = {
    [Symbol.dispose]() {
      target.innerHTML = ''
      dispose()
    }
  }
  const shikitorBase: ShikitorBase = {
    get element() {
      return target
    },
    get value() {
      return valueRef.current
    },
    set value(value) {
      optionsRef.current.value = value
    },
    get optionsRef() {
      return optionsRef
    },
    get options() {
      return snapshot(optionsRef).current
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
      return snapshot(cursorRef).current
    },
    focus(cursor) {
      const { resolvePosition } = this.rawTextHelper
      const resolvedStartPos = resolvePosition(cursor ?? 0)
      input.setSelectionRange(
        resolvedStartPos.offset,
        resolvedStartPos.offset
      )
      input.focus()
    },
    blur() {
      input.blur()
    },
    get rawTextHelper() {
      return snapshot(rawTextHelperRef).current
    },
    get selections() {
      return [prevSelection!]
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
      if (
        [
          prevResolvedPrevSelection.start.offset !== resolvedSelection.start.offset,
          prevResolvedPrevSelection.end.offset !== resolvedSelection.end.offset
        ].some(Boolean)
      ) {
        // TODO
        // options.onSelectionChange?.(selection)
        // callAllShikitorPlugins('onSelectionChange', selection)
        prevSelection = resolvedSelection
      }
      input.setSelectionRange(resolvedSelection.start.offset, resolvedSelection.end.offset)
    }
  }
  const base = completeAssign(
    shikitorBase,
    shikitorDisposable
  )
  const baseWithInternal = completeAssign(
    base,
    shikitorInternal
  )
  const shikitor: Shikitor = completeAssign(
    baseWithInternal,
    completeAssign(shikitorSupportExtend, shikitorSupportPlugin)
  )
  await installAllPlugins(shikitor)
  checkAborted()

  input.addEventListener('keydown', e => callAllShikitorPlugins('onKeydown', e as _KeyboardEvent))
  input.addEventListener('keyup', e => callAllShikitorPlugins('onKeyup', e as _KeyboardEvent))
  input.addEventListener('keypress', e => callAllShikitorPlugins('onKeypress', e as _KeyboardEvent))

  return shikitor
}
