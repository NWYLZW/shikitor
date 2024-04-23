import './App.scss'

import React, { useMemo } from 'react'

import CodeEditor from './examples/CodeEditor'
import CodeEditorPreview from './examples/CodeEditor/Preview'
import MarkdownEditor from './examples/MarkdownEditor'
import MarkdownEditorPreview from './examples/MarkdownEditor/Preview'
import MessageSender from './examples/MessageSender'
import MessageSenderPreview from './examples/MessageSender/Preview'
import { useQueries } from './hooks/useQueries'

const examples = [
  ['Code Editor', CodeEditor, CodeEditorPreview],
  ['Markdown Editor', MarkdownEditor, MarkdownEditorPreview],
  ['Message Sender', MessageSender, MessageSenderPreview]
] as const

export default function App() {
  const {
    value: {
      active = 'Code Editor'
    },
    set
  } = useQueries<{
    active: 'Code Editor' | 'Markdown Editor' | 'Message Sender'
  }>()
  const ActiveComponent = useMemo(() => {
    return examples.find(([n]) => n === active)?.[1]
  }, [active])
  return (
    <>
      {ActiveComponent
        ? <ActiveComponent />
        : <div>Unknown component: {active}</div>}
      <div className='examples'>
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
      </div>
    </>
  )
}
