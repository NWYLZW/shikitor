import './index.scss'

import MarkdownItPluginShiki from '@shikijs/markdown-it'
import provideCompletions from '@shikitor/core/plugins/provide-completions'
import providePopup from '@shikitor/core/plugins/provide-popup'
import provideSelectionToolbox from '@shikitor/core/plugins/provide-selection-toolbox'
import selectionToolboxForMd from '@shikitor/core/plugins/selection-toolbox-for-md'
import { Editor } from '@shikitor/react'
import MarkdownIt from 'markdown-it'
import React, { useRef, useState } from 'react'
import type { BundledLanguage, BundledTheme } from 'shiki'

import { useQueries } from '#hooks/useQueries.tsx'

const bundledPlugins = [
  providePopup,
  provideCompletions({
    popupPlacement: 'top',
    footer: false
  }),
  provideSelectionToolbox,
  selectionToolboxForMd
]

export default function MarkdownEditor() {
  const {
    value: {
      theme = 'github-dark'
    }
  } = useQueries<{
    theme: BundledTheme
    language: BundledLanguage
  }>()
  const [text, setText] = useState('')
  const mdRef = useRef<MarkdownIt>()
  if (!mdRef.current) {
    mdRef.current = MarkdownIt()
    MarkdownItPluginShiki({
      themes: {
        light: theme
      }
    }).then(plugin => mdRef.current?.use(plugin))
  }
  return (<div className='markdown-editor'>
    <div className='header'>
      <div className='left'>
        <div className='title'>Markdown Editor</div>
      </div>
    </div>
    <div className='content'>
      <Editor
        value={text}
        onChange={setText}
        defaultOptions={{
          language: 'markdown',
          theme: 'github-light'
        }}
        plugins={bundledPlugins}
      />
      <div className='s-md'
           dangerouslySetInnerHTML={{
             __html: mdRef.current?.render(text) ?? ''
           }}>

      </div>
    </div>
  </div>
  )
}
