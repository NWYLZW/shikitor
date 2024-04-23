import './App.scss'

import React, { memo, useMemo } from 'react'

import CodeEditor from './examples/CodeEditor'
import { useQueries } from './hooks/useQueries'

const examples = [
  ['Code Editor', memo(CodeEditor), memo(CodeEditor.ExamplePreview)],
  ['Markdown Editor', memo(CodeEditor), memo(CodeEditor.ExamplePreview)],
  ['Message Sender', memo(CodeEditor), memo(CodeEditor.ExamplePreview)]
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
