import type { Shikitor as CoreShikitor, ShikitorOptions } from '@shikitor/core'
import { create } from '@shikitor/core'
import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

export interface ShikitorProps {
  defaultOptions?: ShikitorOptions
}

export type ShikitorRef = CoreShikitor

function Shikitor(props: ShikitorProps, ref: React.Ref<ShikitorRef | undefined>) {
  const { defaultOptions } = props
  const shikitorRef = useRef<ShikitorRef>()
  useImperativeHandle(ref, () => shikitorRef.current, [])
  useEffect(() => {
    return () => {
      shikitorRef.current?.[Symbol.dispose]()
    }
  }, [])
  return <div ref={async ele => {
    if (!ele) return

    shikitorRef.current = await create(ele, defaultOptions)
  }}/>
}

export default forwardRef(Shikitor)
