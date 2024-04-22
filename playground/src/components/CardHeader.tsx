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
    viewMode: 'normal' | 'fullscreen-page' | 'fullscreen-screen'
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
            'fullscreen-page': <Fullscreen1Icon />,
            'fullscreen-screen': <FullscreenExit1Icon />
          }[viewMode]}
          onClick={() =>
            queries.set(
              'viewMode',
              viewMode === 'normal'
                ? 'fullscreen-page'
                : (
                  viewMode === 'fullscreen-page'
                    ? 'fullscreen-screen'
                    : 'normal'
                )
            )}
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
