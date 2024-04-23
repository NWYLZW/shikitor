import type { Shikitor } from '@shikitor/core'
import { WithoutCoreEditor } from '@shikitor/react'
import React, { memo, useMemo, useRef, useState } from 'react'
import type { BundledLanguage, BundledTheme } from 'shiki'

import { usePlugins } from '#hooks/usePlugins.ts'
import { useQueries } from '#hooks/useQueries.tsx'
import { useShikitorCreate } from '#hooks/useShikitorCreate.ts'
import { bundledPluginsInfo } from '#plugins'
import { analyzeHash, DEFAULT_CODE } from '#utils/analyzeHash.ts'
import type { GistFile } from '#utils/gist.ts'
import { getGist } from '#utils/gist.ts'

import { CardHeader } from './components/CardHeader'

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
export default function CodeEditor() {
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
  )
}
