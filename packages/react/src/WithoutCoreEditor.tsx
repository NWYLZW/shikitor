import type { create, Shikitor } from '@shikitor/core'
import React, { forwardRef, useCallback, useEffect, useRef } from 'react'

import { useDefault } from './hooks/useDefault'
import type { EditorProps, EditorRef } from './type'

export interface WithoutCoreEditorProps extends EditorProps {
  create?: typeof create
}

export const WithoutCoreEditor = forwardRef<
  EditorRef, WithoutCoreEditorProps
>(function WithoutCoreEditor(props, ref) {
  const {
    options,
    defaultOptions,
    create,
    onMounted,
    onColorChange
  } = props
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
    onMounted?.(shikitor)
  }, [onMounted, ref])

  const { vRef: optionsRef } = useDefault(options, defaultOptions, opts => {
    const shikitor = shikitorRef.current
    if (!shikitor) return

    shikitor.updateOptions(opts)
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
    create?.(ele, optionsRef.current, { abort: abortSignal })
      .then(mount)
      .catch(e => {
        if (e instanceof Error && e.message === 'Aborted') return
        console.error(e)
      })
    return () => {
      abortController.abort()
      shikitorRef.current?.[Symbol.dispose]()
    }
  }, [create, mount, optionsRef])
  return <div ref={eleRef} />
})
