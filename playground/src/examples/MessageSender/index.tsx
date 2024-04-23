import './index.scss'

import type { Shikitor } from '@shikitor/core'
import { WithoutCoreEditor } from '@shikitor/react'
import React, { useMemo, useRef } from 'react'
import type { BundledLanguage, BundledTheme } from 'shiki'

import { useQueries } from '#hooks/useQueries.tsx'
import { useShikitorCreate } from '#hooks/useShikitorCreate.ts'

export default function MessageSender() {
  const {
    value: {
      theme = 'github-dark'
    }
  } = useQueries<{
    theme: BundledTheme
    language: BundledLanguage
  }>()

  const shikitorRef = useRef<Shikitor>(null)
  const shikitorCreate = useShikitorCreate()
  return (
    <div className='chatroom'>
      <div className='messages'>
      </div>
      <div className='message-sender'>
        <div className='avatar' />
        <WithoutCoreEditor
          ref={shikitorRef}
          create={shikitorCreate}
          options={useMemo(() => ({
            theme,
            language: 'markdown',
            lineNumbers: 'off',
            placeholder: 'Message here...',
            autoSize: { maxRows: 10 }
          }), [theme])}
          onColorChange={({ bg, fg }) => {
            const style = document.documentElement.style
            style.setProperty('--bg', bg)
            style.setProperty('--td-font-gray-1', bg)
            style.setProperty('--td-text-color-anti', bg)
            style.setProperty('--fg', fg)
            style.setProperty('--td-bg-color-container', fg)
            style.setProperty('--td-gray-color-13', fg)
            const hoverColor = `color-mix(in srgb, ${fg}, ${bg} 10%)`
            style.setProperty('--hover', hoverColor)
            style.setProperty('--td-gray-color-1', hoverColor)
          }}
          onMounted={shikitor => shikitor.focus()}
        />
      </div>
    </div>
  )
}
