import './index.scss'

import type { Shikitor } from '@shikitor/core'
import provideCompletions from '@shikitor/core/plugins/provide-completions'
import providePopup from '@shikitor/core/plugins/provide-popup'
import { WithoutCoreEditor } from '@shikitor/react'
import React, { useMemo, useRef, useState } from 'react'
import type { BundledLanguage, BundledTheme } from 'shiki'

import { useQueries } from '#hooks/useQueries.tsx'
import { useShikitorCreate } from '#hooks/useShikitorCreate.ts'

import atUser from './plugins/at-user'

const bundledPlugins = [
  providePopup,
  provideCompletions,
  atUser({
    targets: ['Shikitor', 'YiJie', 'ShikitorBot']
  })
]

export default function Messenger() {
  const {
    value: {
      theme = 'github-dark'
    }
  } = useQueries<{
    theme: BundledTheme
    language: BundledLanguage
  }>()
  const [text, setText] = useState('')

  const shikitorRef = useRef<Shikitor>(null)
  const shikitorCreate = useShikitorCreate()
  return (
    <div className='chatroom'>
      <div className='messages'>
      </div>
      <div className='message-sender'>
        <div className='avatar'>
          <img src='favicon.svg' width={24} height={24} />
        </div>
        <WithoutCoreEditor
          ref={shikitorRef}
          create={shikitorCreate}
          value={text}
          onChange={setText}
          options={useMemo(() => ({
            theme,
            language: 'markdown',
            lineNumbers: 'off',
            placeholder: 'Message here...',
            autoSize: { maxRows: 10 }
          }), [theme])}
          plugins={bundledPlugins}
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
        <div className='send-tooltip'>
          <kbd>⌘ enter</kbd>
        </div>
      </div>
    </div>
  )
}
