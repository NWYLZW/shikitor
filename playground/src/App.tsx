import './App.scss'
import 'tdesign-react/es/style/index.css'

import { WithoutCoreEditor } from '@shikitor/react/WithoutCoreEditor'
import React, { useState } from 'react'
import type { BundledLanguage, BundledTheme } from 'shiki'
import { bundledLanguagesInfo, bundledThemesInfo } from 'shiki'
import { Fullscreen1Icon, FullscreenExit1Icon } from 'tdesign-icons-react'
import { Button, Link, Select } from 'tdesign-react/esm'

import { useShikitorCreate } from './hooks/useShikitorCreate'
import type { GistFile } from './utils/gist'
import { getGist } from './utils/gist'
import { zipStr } from './utils/zipStr'

export default function App() {
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
    <WithoutCoreEditor
      create={shikitorCreate}
      options={{
        theme,
        language
      }}
      onColorChange={({ bg, fg }) => {
        document.documentElement.style.setProperty('--bg', bg)
        document.documentElement.style.setProperty('--fg', fg)
      }}
      onMounted={shikitor => {
        console.log('mounted', shikitor)
        // await shikitor.upsertPlugin({
        //   name: 'shikitor-saver',
        //   onKeydown(e) {
        //     if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        //       e.preventDefault()
        //       const code = this.value
        //       const url = new URL(location.href)
        //
        //       let newHashStr = ''
        //       if (code !== DEFAULT_CODE) {
        //         newHashStr = `zip-code/${zipStr(code)}`
        //       }
        //       url.hash = newHashStr
        //
        //       const query = new URLSearchParams()
        //       this.options.language
        //       && query.set('language', this.options.language)
        //       this.options.theme
        //       && query.set('theme', this.options.theme)
        //       query.set('fullscreen', String(fullscreenCount))
        //       url.search = query.toString()
        //       history.pushState(null, '', url.toString())
        //     }
        //   }
        // })
        // if (hashType === 'gist') {
        //   shikitor.value = '// Loading from gist...'
        //   const [hash, filename, revision] = hashContent.split('/')
        //   let isNotFound = false
        //   let files: GistFile[] | undefined
        //   try {
        //     const { file, files: getFiles } = await getGist(hash, filename, revision)
        //     if (file?.content) {
        //       shikitor.value = file?.content
        //     } else {
        //       isNotFound = true
        //       files = Object.values(getFiles)
        //     }
        //   } catch (e) {
        //     const error = e as Error
        //     if ('message' in error && error.message === 'Not Found') {
        //       isNotFound = true
        //     } else {
        //       throw e
        //     }
        //   }
        //   if (isNotFound) {
        //     if (files) {
        //       console.error('File not found, available files are: ' + files.map(file => file.filename).join(', '))
        //     } else {
        //       console.error('Gist not found, the hash may be invalid or the gist is private')
        //     }
        //   }
        // }
      }}
    />
  </div>
}
