import './index.scss'

import type { Shikitor } from '@shikitor/core'
import provideCompletions from '@shikitor/core/plugins/provide-completions'
import providePopup from '@shikitor/core/plugins/provide-popup'
import provideSelectionToolbox from '@shikitor/core/plugins/provide-selection-toolbox'
import selectionToolboxForMd from '@shikitor/core/plugins/selection-toolbox-for-md'
import { WithoutCoreEditor } from '@shikitor/react'
import type { ClientOptions } from 'openai'
import OpenAI from 'openai'
import React, { useMemo, useRef, useState } from 'react'
import type { BundledLanguage, BundledTheme } from 'shiki'
import { Avatar, Button, Input, MessagePlugin, Select } from 'tdesign-react'

import { useQueries } from '#hooks/useQueries.tsx'
import { useShikitorCreate } from '#hooks/useShikitorCreate.ts'

import type { IMessage, IUser } from './components/Message'
import { Message } from './components/Message'
import atUser from './plugins/at-user'

type MessageItem = IMessage & {
  hidden?: boolean
}

const bundledPlugins = [
  providePopup,
  provideCompletions({
    popupPlacement: 'top',
    footer: false
  }),
  atUser({
    targets: ['Shikitor', 'YiJie', 'ShikitorBot']
  }),
  provideSelectionToolbox,
  selectionToolboxForMd
]

const currentUser = {
  name: 'YiJie'
} as IUser
type Bot = IUser & {
  description: string
}
const bots = {
  documentHelper: {
    name: 'Document Helper Bot',
    avatar: `${import.meta.env.BASE_URL}public/favicon.svg`,
    description: 'You can ask me anything about shikitor.'
  }
} satisfies Record<string, Bot>

function messageTransform(bot: Bot, m: MessageItem): OpenAI.ChatCompletionMessageParam {
  const isBot = m.user?.name === bot.name
  return {
    role: isBot ? 'assistant' : 'user',
    content: `${isBot ? '' : `${m.user?.name}:\n`}${m.text}`
  }
}

export default function Messenger() {
  const {
    value: {
      theme = 'github-dark'
    }
  } = useQueries<{
    theme: BundledTheme
    language: BundledLanguage
  }>()
  const [text, setText] = useState('')

  const storageConfig = JSON.parse(
    localStorage.getItem('openai-config') ?? '{ "baseURL": "https://api.openai.com/v1" }'
  )
  const [config, setConfig] = useState(
    {
      ...storageConfig,
      dangerouslyAllowBrowser: true
    } as ClientOptions
  )
  const openaiRef = useRef<OpenAI | null>(null)
  function createOpenAI() {
    if (!config.apiKey || !config.baseURL) return
    openaiRef.current = new OpenAI(config)
  }
  openaiRef.current === null && createOpenAI()

  const [messages, setMessages] = useState<MessageItem[]>([])
  const isEmpty = useMemo(() => messages.length === 0, [messages])
  const sendMessage = async (message: string) => {
    const newMessages = [...messages, {
      text: message,
      user: currentUser,
      ctime: Date.now()
    }] satisfies MessageItem[]
    setMessages(newMessages)
    setText('')
    if (!openaiRef.current) {
      await MessagePlugin.error('OpenAI not initialized')
      return
    }
    const bot = bots.documentHelper
    const completions = await openaiRef.current.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          content: `Your name is "${bot.name}" and your description is "${bot.description}".\n`
            + 'Every message except yours has a corresponding username, in the format where the current message username appears at the beginning of each message.',
          role: 'system'
        },
        ...newMessages.map(messageTransform.bind(null, bots.documentHelper))
      ],
      stream: true
    })
    newMessages.push({
      text: '',
      user: bots.documentHelper,
      ctime: Date.now()
    })
    const latestMessage = newMessages[newMessages.length - 1]
    let streamMessage = ''
    for await (const { choices: [{ delta }] } of completions) {
      streamMessage += delta.content ?? ''
      latestMessage.text = streamMessage
      setMessages([...newMessages])
    }
  }

  const shikitorRef = useRef<Shikitor>(null)
  const shikitorCreate = useShikitorCreate()
  return (
    <div className='chatroom'>
      <div className='header'>
        <div className='left'>
          <Avatar
            size='small'
            image={bots.documentHelper.avatar}
          />
          <div className='title'>Shikitor Chatroom</div>
        </div>
        <div className='right'>
          <Button
            variant='dashed'
            shape='square'
            onClick={() => {
              setMessages([])
              localStorage.removeItem('openai-config')
            }}
          >
            <span className='shikitor-icon'>delete_forever</span>
          </Button>
        </div>
      </div>
      <div className='messages'>
        {!isEmpty
          ? messages.map((message, i) => (
            <Message
              key={i}
              value={message}
            />
          ))
          : (
            <div className='config'>
              <div className='config-item'>
                <label>API Key</label>
                <Input value={config.apiKey} onChange={v => setConfig(old => ({ ...old, apiKey: v }))} />
              </div>
              <div className='config-item'>
                <label>Base URL</label>
                <Select
                  filterable
                  creatable
                  options={[
                    { label: 'OpenAI', value: 'https://api.openai.com/v1' },
                    { label: 'AIProxy', value: 'https://api.aiproxy.io/v1' }
                  ]}
                  value={config.baseURL ?? ''}
                  onChange={v => setConfig(old => ({ ...old, baseURL: v as string }))}
                />
              </div>
              <Button
                style={{
                  marginTop: 8
                }}
                onClick={() => {
                  createOpenAI()
                  localStorage.setItem('openai-config', JSON.stringify(config))
                }}
              >
                Confirm
              </Button>
            </div>
          )}
      </div>
      <div className='message-sender'>
        <Avatar size='small'>YiJie</Avatar>
        <WithoutCoreEditor
          ref={shikitorRef}
          create={shikitorCreate}
          value={text}
          onChange={setText}
          options={useMemo(() => ({
            theme,
            language: 'markdown',
            lineNumbers: 'off',
            placeholder: 'Typing here...',
            autoSize: { maxRows: 10 }
          }), [theme])}
          plugins={bundledPlugins}
          onColorChange={({ bg, fg }) => {
            const style = document.documentElement.style
            style.setProperty('--bg', bg)
            style.setProperty('--fg', fg)
            const hoverColor = `color-mix(in srgb, ${fg}, ${bg} 10%)`
            style.setProperty('--hover', hoverColor)
            style.setProperty('--td-text-color-primary', bg)
          }}
          onMounted={shikitor => shikitor.focus()}
          onKeydown={e => {
            if (e.key === 'Enter' && e.metaKey && text.length !== 0) {
              e.preventDefault()
              sendMessage(text)
              return
            }
          }}
        />
        <div className='send-tooltip'>
          <kbd>⌘ enter</kbd>
        </div>
      </div>
    </div>
  )
}
