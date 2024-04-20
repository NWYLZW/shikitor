import './App.scss'
import 'tdesign-react/es/style/index.css'

import type { Shikitor } from '@shikitor/core'
import bracketMatcher from '@shikitor/core/plugins/bracket-matcher'
import codeStyler from '@shikitor/core/plugins/code-styler'
import { WithoutCoreEditor } from '@shikitor/react/WithoutCoreEditor'
import React, { memo, useMemo, useState } from 'react'
import type { BundledLanguage, BundledTheme } from 'shiki'
import { bundledLanguagesInfo, bundledThemesInfo } from 'shiki'
import { Fullscreen1Icon, FullscreenExit1Icon } from 'tdesign-icons-react'
import { Button, Link, Select } from 'tdesign-react'

import { useShikitorCreate } from './hooks/useShikitorCreate'
import saver from './plugins/saver'
import { analyzeHash, DEFAULT_CODE } from './utils/analyzeHash'
import type { GistFile } from './utils/gist'
import { getGist } from './utils/gist'

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
  const [theme, setTheme] = useState<BundledTheme>('github-dark')
  const [language, setLanguage] = useState<BundledLanguage>('typescript')

  const [viewMode, setViewMode] = useState<'normal' | 'fullscreen-page' | 'fullscreen-screen'>('normal')

  const shikitorCreate = useShikitorCreate()
  return <div className='card'>
    <div className='header'>
      <div className='left'>
        <Select
          filterable
          borderless
          size='small'
          value={language}
          onChange={setLanguage as any}
          options={bundledLanguagesInfo.map(lang => ({
            value: lang.id,
            label: lang.name
          }))}
        />
        <Select
          filterable
          borderless
          size='small'
          value={theme}
          onChange={setTheme as any}
          options={bundledThemesInfo.map(theme => ({
            value: theme.id,
            label: theme.displayName
          }))}
        />
      </div>
      <div className='right'>
        <Button
          ghost
          variant='text'
          shape='square'
          icon={{
            normal: <Fullscreen1Icon />,
            'fullscreen-page': <Fullscreen1Icon />,
            'fullscreen-screen': <FullscreenExit1Icon />
          }[viewMode]}
          onClick={() => setViewMode(viewMode === 'normal'
            ? 'fullscreen-page'
            : viewMode === 'fullscreen-page'
              ? 'fullscreen-screen'
              : 'normal'
          )}
        />
        <Link
          hover='color'
          href='https://github.com/nwylzw/shikitor'
          target='_blank'
        >
          <img src='https://github.githubassets.com/favicons/favicon.svg' alt='github' width='16' height='16'/>
        </Link>
      </div>
    </div>
    <MemoEditor
      create={shikitorCreate}
      value={code}
      onChange={setCode}
      options={useMemo(() => ({
        theme,
        language,
        plugins: [saver, bracketMatcher, codeStyler]
      }), [theme, language])}
      onColorChange={({ bg, fg }) => {
        document.documentElement.style.setProperty('--bg', bg)
        document.documentElement.style.setProperty('--fg', fg)
      }}
      onMounted={initPlaygroundShikitor}
    />
  </div>
}
