import type { Shikitor as CoreShikitor, ShikitorOptions } from '@shikitor/core'
import { create } from '@shikitor/core'
import type { Ref } from 'react'
import React, { forwardRef, useImperativeHandle, useRef } from 'react'

export interface ShikitorProps {
  defaultOptions?: ShikitorOptions
}

export type ShikitorRef = CoreShikitor

function Shikitor(props: ShikitorProps, ref: Ref<ShikitorRef | undefined>) {
  const { defaultOptions } = props
  const shikitorRef = useRef<ShikitorRef>()
  useImperativeHandle(ref, () => shikitorRef.current, [])
  return <div ref={async ele => {
    if (!ele) return

    shikitorRef.current = await create(ele, defaultOptions)
  }}/>
}

export default forwardRef(Shikitor)
