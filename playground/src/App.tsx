import './App.scss'
import 'tdesign-react/es/style/index.css'

import React, { useState } from 'react'
import type { BundledLanguage, BundledTheme } from 'shiki'
import { bundledLanguagesInfo, bundledThemesInfo } from 'shiki'
import { Fullscreen1Icon, FullscreenExit1Icon } from 'tdesign-icons-react'
import { Button, Link, Select } from 'tdesign-react/esm'

import Editor from './components/Editor'
import { useShikitorCreate } from './hooks/useShikitorCreate'

export default function App() {
  const [language, setLanguage] = useState<BundledLanguage>('typescript')
  const [theme, setTheme] = useState<BundledTheme>('github-dark')

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
    <Editor
      create={shikitorCreate}
      options={{
        language,
        theme
      }}
    />
  </div>
}
