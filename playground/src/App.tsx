import './App.scss'

import { classnames } from '@shikitor/core/utils'
import React, { lazy, Suspense, useMemo } from 'react'

import CodeEditorPreview from './examples/CodeEditor/Preview'
import MarkdownEditorPreview from './examples/MarkdownEditor/Preview'
import MessengerPreview from './examples/Messenger/Preview'
import { useQueries } from './hooks/useQueries'

const examples = [
  ['Code Editor', lazy(() => import('./examples/CodeEditor')), CodeEditorPreview],
  ['Markdown Editor', lazy(() => import('./examples/MarkdownEditor')), MarkdownEditorPreview],
  ['Messenger', lazy(() => import('./examples/Messenger')), MessengerPreview]
] as const

export default function App() {
  const {
    value: {
      active = 'Code Editor',
      topBarVisible = 'true'
    },
    set
  } = useQueries<{
    active: 'Code Editor' | 'Markdown Editor' | 'Messenger'
    topBarVisible: string
  }>()
  const ActiveComponent = useMemo(() => {
    return examples.find(([n]) => n === active)?.[1]
  }, [active])
  return (
    <>
      {ActiveComponent
        ? <Suspense fallback={<div className='loading'>Loading...</div>}>
          <ActiveComponent />
        </Suspense>
        : <div>Unknown component: {active}</div>}
      <div className={classnames(
        'examples', topBarVisible === 'false' && 'examples__hide')}>
        {examples.map(([name, _, Preview]) => (
          <div
            key={name}
            className={'example' + (name === active ? ' active' : '')}
            onClick={() => set('active', name)}
          >
            <h4>{name}</h4>
            <div className='preview'>
              <Preview />
            </div>
          </div>
        ))}
        <div className='switch' onClick={() => {
          set('topBarVisible', topBarVisible === 'true' ? 'false' : 'true')
        }}>
          <span className='shikitor-icon'>keyboard_arrow_up</span>
        </div>
      </div>
    </>
  )
}
