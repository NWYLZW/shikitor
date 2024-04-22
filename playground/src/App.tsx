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
  const { value: {
    theme = 'github-dark',
    language = 'typescript'
  } } = useQueries<{
    theme: BundledTheme
    language: BundledLanguage
  }>()

  const shikitorRef = useRef<Shikitor>(null)
  const shikitorCreate = useShikitorCreate()
  usePlugins(shikitorRef)
  return <div className='card'>
    <CardHeader />
    <MemoEditor
      ref={shikitorRef}
      create={shikitorCreate}
      value={code}
      onChange={setCode}
      options={useMemo(() => ({
        theme,
        language,
        plugins
      }), [theme, language])}
      onColorChange={({ bg, fg }) => {
        document.documentElement.style.setProperty('--bg', bg)
        document.documentElement.style.setProperty('--fg', fg)
      }}
      onMounted={initPlaygroundShikitor}
    />
  </div>
}
