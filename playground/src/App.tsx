import './App.scss'
import 'tdesign-react/es/style/index.css'

import type { Shikitor } from '@shikitor/core'
import { WithoutCoreEditor } from '@shikitor/react/WithoutCoreEditor'
import React, { memo, useMemo, useRef, useState } from 'react'
import type { BundledLanguage, BundledTheme } from 'shiki'

import { CardHeader } from './components/CardHeader'
import { usePlugins } from './hooks/usePlugins'
import { useQueries } from './hooks/useQueries'
import { useShikitorCreate } from './hooks/useShikitorCreate'
import { bundledPluginsInfo } from './plugins'
import { analyzeHash, DEFAULT_CODE } from './utils/analyzeHash'
import type { GistFile } from './utils/gist'
import { getGist } from './utils/gist'

const plugins = bundledPluginsInfo.map(({ module: { default: d } }) => d)

const MemoEditor = memo(WithoutCoreEditor)

async function initPlaygroundShikitor(shikitor: Shikitor) {
  const { type, content } = analyzeHash()
  if (type === 'gist') {
    shikitor.value = '// Loading from gist...'
    const [hash, filename, revision] = content.split('/')
    let isNotFound = false
    let files: GistFile[] | undefined
    try {
      const { file, files: getFiles } = await getGist(hash, filename, revision)
      if (file?.content) {
        shikitor.value = file?.content
      } else {
        isNotFound = true
        files = Object.values(getFiles)
      }
    } catch (e) {
      const error = e as Error
      if ('message' in error && error.message === 'Not Found') {
        isNotFound = true
      } else {
        throw e
      }
    }
    if (isNotFound) {
      if (files) {
        console.error('File not found, available files are: ' + files.map(file => file.filename).join(', '))
      } else {
        console.error('Gist not found, the hash may be invalid or the gist is private')
      }
    }
  }
}

const { code: hashCode } = analyzeHash()
export default function App() {
  const [code, setCode] = useState(hashCode ?? DEFAULT_CODE)
  const {
    value: {
      theme = 'github-dark',
      language = 'typescript'
    }
  } = useQueries<{
    theme: BundledTheme
    language: BundledLanguage
  }>()

  const shikitorRef = useRef<Shikitor>(null)
  const shikitorCreate = useShikitorCreate()
  usePlugins(shikitorRef)
  return (
    <>
      <div className='card'>
        <CardHeader />
        <MemoEditor
          ref={shikitorRef}
          create={shikitorCreate}
          value={code}
          onChange={setCode}
          options={useMemo(() => ({
            theme,
            language
          }), [theme, language])}
          plugins={plugins}
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
          onMounted={initPlaygroundShikitor}
        />
      </div>
      <div className='examples'>
        <div className='example active'>
          <h4>Code Editor</h4>
          <div className='preview'>
            <div className='code-block-line'>
              <pre className='code-block' style={{ backgroundColor: '#bd89e2' }}>{' '.repeat(2)}</pre>
              <pre className='code-block' style={{ backgroundColor: '#e87d85' }}>{' '.repeat(5)}</pre>
              <pre className='code-block' style={{ backgroundColor: '#9faebe' }}>{' '}</pre>
            </div>
            <div className='code-block-line'>
              <pre className='code-block' style={{ backgroundColor: 'transparent' }}>{' '.repeat(2)}</pre>
              <pre className='code-block' style={{ backgroundColor: '#8ad097' }}>{' '.repeat(3)}</pre>
            </div>
            <div className='code-block-line highlight'>
              <pre className='code-block' style={{ backgroundColor: 'transparent' }}>{' '.repeat(2)}</pre>
              <pre className='code-block' style={{ backgroundColor: '#8ad097' }}>{' '.repeat(6)}</pre>
              <pre className='code-block' style={{ backgroundColor: '#e2b876' }}>{' '.repeat(2)}</pre>
              <div className='code-cursor' />
              <div className='code-completions'>
                <div className='code-completion'></div>
                <div className='code-completion'></div>
              </div>
            </div>
            <div className='code-block-line'>
              <pre className='code-block' style={{ backgroundColor: '#9faebe' }}>{' '}</pre>
            </div>
            <div className='code-block-line'>
              <pre className='code-block' style={{ backgroundColor: '#e87d85' }}>{' '.repeat(5)}</pre>
            </div>
          </div>
        </div>
        <div className='example'>
          <h4>Markdown Editor</h4>
          <div className='preview'>
            Not implemented
          </div>
        </div>
        <div className='example'>
          <h4>Message Sender</h4>
          <div className='preview'>
            Not implemented
          </div>
        </div>
      </div>
    </>
  )
}
