import './index.scss'

import { getHighlighter } from 'shiki'
import { derive } from 'valtio/utils'
import { proxy, snapshot } from 'valtio/vanilla'

import type { IDisposable, ResolvedSelection, Shikitor, ShikitorOptions } from '../editor'
import { EventEmitter } from '../editor/base.eventEmitter'
import type { ResolvedPopup } from '../editor/register'
import type { _KeyboardEvent, ShikitorPlugin } from '../plugin'
import type { PickByValue } from '../types'
import { callUpdateDispatcher, diffArray, isMultipleKey, isWhatBrowser, listen, throttle } from '../utils' with {
  'unbundled-reexport': 'on'
}
import { calcTextareaHeight } from '../utils/calcTextareaHeight'
import { isSameSnapshot } from '../utils/valtio/isSameSnapshot'
import { scoped } from '../utils/valtio/scoped'
import { cursorControlled } from './controlled/cursorControlled'
import { popupsControlled } from './controlled/popupsControlled'
import { valueControlled } from './controlled/valueControlled'
import { resolveInputPlugins } from './resolveInputPlugins'
import { shikitorStructureTransformer } from './structureTransfomer'

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

  let pluginsDisposes: (void | IDisposable)[] = []
  const disposes: (() => void)[] = []
  const { disposeScoped, scopeWatch, scopeSubscribe } = scoped()

  const dispose = () => {
    disposeScoped()
    disposes.forEach(dispose => dispose())
    disposeAllPlugins()
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
    dispose: disposePopupsControlled,
    popups
  } = popupsControlled(() => shikitor, target)
  disposes.push(disposePopupsControlled)
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

  const pluginsRef = derive({
    current: get => get(optionsRef).current.plugins
  })
  function callAllShikitorPlugins<
    K extends Exclude<keyof PickByValue<ShikitorPlugin, (...args: any[]) => any>, undefined>
  >(method: K, ...args: Parameters<Exclude<ShikitorPlugin[K], undefined>>) {
    const plugins = pluginsRef.current
    return plugins.map(plugin => {
      let funcRT = plugin[method]?.call(
        shikitor,
        // @ts-ignore
        ...args
      )
      if (['install', 'onDispose'].includes(method)) {
        funcRT = Promise.resolve(funcRT)
          .then(rt => {
            const eventName = {
              install: 'install',
              onDispose: 'dispose'
            }[method as 'install' | 'onDispose']
            shikitor.ee.emit(eventName, plugin.name, shikitor)
            return rt
          })
      }
      return funcRT
    })
  }
  let prevPluginSnapshots = snapshot(pluginsRef).current
  scopeSubscribe(pluginsRef, async () => {
    const pluginSnapshots = snapshot(pluginsRef).current
    if (prevPluginSnapshots === pluginSnapshots) {
      return
    }
    const { added, reordered, removed } = diffArray(prevPluginSnapshots, pluginSnapshots, isSameSnapshot)
    for (const plugin of removed) {
      const index = prevPluginSnapshots.indexOf(plugin)
      if (index === -1) return
      pluginsDisposes[index]?.dispose()
      plugin.onDispose?.call(shikitor)
      shikitor.ee.emit('dispose', plugin.name)
    }
    for (const plugin of removed) {
      const index = prevPluginSnapshots.indexOf(plugin)
      if (index === -1) return
      pluginsDisposes.splice(index, 1)
    }
    for (const [oldI, newI] of reordered) {
      const temp = pluginsDisposes[oldI]
      pluginsDisposes[oldI] = pluginsDisposes[newI]
      pluginsDisposes[newI] = temp
    }
    await Promise.all(
      added.map(async ([plugin, index]) => {
        const dispose = await plugin.install?.call(shikitor, shikitor)
        shikitor.ee.emit('install', plugin.name, shikitor)
        if (index < pluginsDisposes.length) {
          pluginsDisposes.splice(index, 0, dispose)
        } else if (index === pluginsDisposes.length) {
          pluginsDisposes.push(dispose)
        } else {
          pluginsDisposes[index] = dispose
        }
      })
    )
    prevPluginSnapshots = pluginSnapshots
  })

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
    decorations: get => get(optionsRef).current.decorations
  })
  scopeWatch(async get => {
    const value = get(valueRef).current
    const cursor = get(cursorRef).current
    const {
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
        shikitorStructureTransformer(target, cursorLine)
      ]
    })
  })

  const shikitor: Shikitor = {
    ee,
    get value() {
      return valueRef.current
    },
    set value(value) {
      optionsRef.current.value = value
    },
    get options() {
      return snapshot(optionsRef).current
    },
    optionsRef,
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
    get selections() {
      return [prevSelection!]
    },
    get rawTextHelper() {
      return snapshot(rawTextHelperRef).current
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
    },
    async upsertPlugin(plugin, index) {
      const p = await Promise.resolve(typeof plugin === 'function' ? plugin() : plugin)
      if (p === undefined) {
        throw new Error('Not provided plugin')
      }
      const plugins = pluginsRef.current
      const realIndex = index ?? plugins.length - 1
      if (realIndex < 0 || realIndex >= plugins.length) {
        throw new Error('Invalid index')
      }
      if (index === undefined) {
        plugins?.push(p)
      } else {
        plugins?.splice(index, 1, p)
      }
      return realIndex
    },
    async removePlugin(index) {
      const plugins = pluginsRef.current
      const p = plugins[index]
      if (p === undefined) {
        throw new Error(`Not found plugin at index ${index}`)
      }
      plugins?.splice(index, 1)
    },
    [Symbol.dispose]() {
      target.innerHTML = ''
      dispose()
    },
    registerPopupProvider(provider) {
      const { providePopups, ...meta } = provider
      const popupsPromise = Promise.resolve(providePopups())

      let pushedFirstPopupRef: ResolvedPopup | undefined
      let pushedPopupsLength = 0
      let popupsProvideDispose: (() => void) | undefined
      popupsPromise.then(({ dispose, popups: newPopups }) => {
        popupsProvideDispose = dispose
        const resolvedPopups = newPopups.map(popup => ({
          ...meta,
          ...popup
        })) as ResolvedPopup[]
        popups.splice(0, popups.length, ...resolvedPopups)
        pushedPopupsLength = resolvedPopups.length
        pushedFirstPopupRef = popups[popups.length - pushedPopupsLength]
      })
      const removeNewPopups = () => {
        if (pushedFirstPopupRef === undefined) return
        const firstIndex = popups.indexOf(pushedFirstPopupRef)

        popups.splice(firstIndex, pushedPopupsLength)
      }
      const disposePositionRerender = meta.position === 'relative'
        ? scopeWatch(async get => {
          const cursor = get(cursorRef).current
          if (pushedFirstPopupRef === undefined) return

          const firstIndex = popups.indexOf(pushedFirstPopupRef)
          for (let i = firstIndex; i < firstIndex + pushedPopupsLength; i++) {
            const popup = popups[i]
            if (popup.position === 'relative') {
              popup.cursors = [cursor]
              popup.selections = [prevSelection!]
            }
          }
        })
        : undefined
      return {
        dispose() {
          if (popupsProvideDispose) {
            popupsProvideDispose()
          } else {
            popupsPromise.then(({ dispose }) => dispose?.())
          }
          disposePositionRerender?.()
          removeNewPopups?.()
        }
      }
    },
    extend(key, obj) {
      const properties = Object.getOwnPropertyDescriptors(obj)
      const newPropDescs: [string, PropertyDescriptor][] = []
      for (const [prop, descriptor] of Object.entries(properties)) {
        if (prop in this) {
          throw new Error(`Property "${prop}" already exists`)
        }
        newPropDescs.push([prop, descriptor])
        Object.defineProperty(this, prop, descriptor)
      }
      return () => {
        for (const [prop] of newPropDescs) {
          // @ts-ignore
          delete this[prop]
        }
      }
    },
    depend(keys, listener) {
      let installed = false
      let installedPlugins = new Set<string>()
      function allKeysInstalled() {
        return keys.every(key => installedPlugins.has(key))
      }
      const listenPluginsInstalled = () => {
        installedPlugins = new Set<string>()
        const offInstallListener = this.ee.on('install', key => {
          if (!key) return
          installedPlugins.add(key)
          if (allKeysInstalled()) {
            listener(this as any)
            offInstallListener?.()
            installed = true
          }
        })
      }
      listenPluginsInstalled()
      const offDisposeListener = this.ee.on('dispose', key => {
        if (!key) return
        if (!(keys as string[]).includes(key)) return
        if (!installed) return

        installed = false
        listenPluginsInstalled()
      })
      return {
        dispose() {
          offDisposeListener?.()
        }
      }
    },
    _getCursorAbsolutePosition(cursor): { x: number; y: number } {
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
      const text = '\n'.repeat(cursor.line - 1) + line(cursor).substring(0, cursor.character)
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
        y: rect.bottom + top
      }
    }
  }
  pluginsDisposes = await Promise.all(
    callAllShikitorPlugins('install', shikitor)
  )
  checkAborted()
  function disposeAllPlugins() {
    pluginsDisposes.forEach(({ dispose } = { dispose: () => void 0 }) => dispose())
    pluginsDisposes = []
  }

  let prevOutputHoverElement: Element | null = null
  input.addEventListener(
    'mousemove',
    throttle(e => {
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
        outputHoverElement.className.includes('shikitor')
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
    }, 50)
  )

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
  input.addEventListener('keydown', e => callAllShikitorPlugins('onKeydown', e as _KeyboardEvent))
  input.addEventListener('keyup', e => callAllShikitorPlugins('onKeyup', e as _KeyboardEvent))
  input.addEventListener('keypress', e => callAllShikitorPlugins('onKeypress', e as _KeyboardEvent))

  return shikitor
}
