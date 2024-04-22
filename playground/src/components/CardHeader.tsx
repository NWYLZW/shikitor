import './CardHeader.scss'

import React from 'react'
import { type BundledLanguage, bundledLanguagesInfo, type BundledTheme, bundledThemesInfo } from 'shiki'
import { Fullscreen1Icon, FullscreenExit1Icon } from 'tdesign-icons-react'
import { Button, Link, Select } from 'tdesign-react'

import { useQueries } from '../hooks/useQueries'

export function CardHeader() {
  const queries = useQueries<{
    theme: BundledTheme
    language: BundledLanguage
    viewMode: 'normal' | 'fullview' | 'fullscreen'
  }>()
  const {
    theme = 'github-dark',
    language = 'typescript',
    viewMode = 'normal'
  } = queries.value ?? {}
  return (
    <div className='card-header'>
      <div className='left'>
        <Select
          filterable
          borderless
          size='small'
          value={language}
          onChange={v => queries.set('language', v as string)}
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
          onChange={v => queries.set('theme', v as string)}
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
            'fullview': <Fullscreen1Icon />,
            'fullscreen': <FullscreenExit1Icon />
          }[viewMode]}
          onClick={() => {
            const newMode = viewMode === 'normal'
              ? 'fullview'
              : (
                viewMode === 'fullview'
                  ? 'fullscreen'
                  : 'normal'
              )
            document.body.classList.toggle('fullview', newMode !== 'normal')
            if (document.fullscreenElement) {
              document.exitFullscreen()
            }
            if (newMode === 'fullscreen') {
              document.documentElement.requestFullscreen()
            }
            queries.set('viewMode', newMode)
          }}
        />
        <Link
          hover='color'
          href='https://github.com/nwylzw/shikitor'
          target='_blank'
        >
          <img src='https://github.githubassets.com/favicons/favicon.svg' alt='github' width='16' height='16' />
        </Link>
      </div>
    </div>
  )
}
