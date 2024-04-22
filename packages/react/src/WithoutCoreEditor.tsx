import type { create, Shikitor } from '@shikitor/core'
import React, { forwardRef, useCallback, useEffect, useRef } from 'react'

import { useDefault } from './hooks/useDefault'
import { useEvent } from './hooks/useEvent'
import type { EditorProps, EditorRef } from './type'

export interface WithoutCoreEditorProps extends EditorProps {
  create?: typeof create
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
    onColorChange
  } = props
  const emitChange = useEvent(onChange)
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
    onMounted?.(shikitor)
  }, [emitChange, onMounted, ref])

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

    const observer = new MutationObserver(mutationsList => {
      for (const mutation of mutationsList) {
        if (mutation.attributeName === 'style') {
          const bg = getComputedStyle(ele).backgroundColor
          const fg = getComputedStyle(ele).color
          onColorChange?.({ bg, fg })
        }
      }
    })
    observer.observe(ele, { attributes: true, attributeFilter: ['style'] })
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
  return <div ref={eleRef} />
})
