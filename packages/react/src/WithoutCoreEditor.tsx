import type { create, Shikitor } from '@shikitor/core'
import React, { forwardRef, useCallback, useEffect, useRef } from 'react'

import { useDefault } from './hooks/useDefault'
import { useEvent } from './hooks/useEvent'
import type { EditorProps, EditorRef, StyledProps } from './type'

export interface WithoutCoreEditorProps extends EditorProps, StyledProps {
  create?: typeof create
}

// TODO abstract to @shikitor/utils
function debounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
  let timer: number
  return (...args: any[]) => {
    clearTimeout(timer)
    timer = window.setTimeout(() => fn(...args), delay)
  }
}

export const WithoutCoreEditor = forwardRef<
  EditorRef,
  WithoutCoreEditorProps
>(function WithoutCoreEditor(props, ref) {
  const {
    value,
    defaultValue,
    onChange,
    options,
    defaultOptions,
    plugins,
    create,
    onMounted,
    onColorChange,
    style,
    className
  } = props
  const emitChange = useEvent(onChange)
  const emitMounted = useEvent(onMounted)
  const shikitorRef = useRef<Shikitor | null>(null)
  const eleRef = useRef<HTMLDivElement>(null)

  const mount = useCallback((shikitor: Shikitor) => {
    shikitorRef.current = shikitor
    if (ref) {
      if (typeof ref === 'function') {
        ref(shikitor)
      } else {
        ref.current = shikitor
      }
    }
    shikitor.ee.on('change', emitChange)
    emitMounted(shikitor)
  }, [emitChange, emitMounted, ref])

  const { vRef: valueRef } = useDefault(value, defaultValue, v => {
    const shikitor = shikitorRef.current
    if (!shikitor) return

    shikitor.value = v
  })
  const { vRef: optionsRef } = useDefault(options, defaultOptions, opts => {
    const shikitor = shikitorRef.current
    if (!shikitor) return

    shikitor.updateOptions(old => ({ ...old, ...opts }))
  })

  useEffect(() => {
    if (!eleRef.current) return
    const ele = eleRef.current

    const throttleChange = debounce(onColorChange ?? (() => void 0), 20)
    const observer = new MutationObserver(mutationsList => {
      for (const mutation of mutationsList) {
        const target = mutation.target as HTMLElement
        if (mutation.attributeName === 'style') {
          const bg = target.style.backgroundColor
          const fg = target.style.color
          throttleChange({ bg, fg })
        }
      }
    })
    observer.observe(ele, { attributes: true, attributeFilter: ['style'] })
    return () => observer.disconnect()
  }, [onColorChange])
  useEffect(() => {
    if (!eleRef.current) return
    const ele = eleRef.current

    const abortController = new AbortController()
    const abortSignal = abortController.signal
    const overrideOpts = {
      ...optionsRef.current,
      plugins
    }
    if (valueRef.current) {
      overrideOpts.value = valueRef.current
    }
    create?.(ele, overrideOpts, { abort: abortSignal })
      .then(mount)
      .catch(e => {
        if (e instanceof Error && e.message === 'Aborted') return
        console.error(e)
      })
    return () => {
      abortController.abort()
      shikitorRef.current?.[Symbol.dispose]()
    }
  }, [create, mount, optionsRef, plugins, valueRef])
  return (
    <div
      ref={eleRef}
      style={style}
      className={className}
    />
  )
})
