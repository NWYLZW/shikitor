import type { Shikitor, ShikitorOptions } from '@shikitor/core'
import type { create } from '@shikitor/core'
import React, { useEffect, useRef } from 'react'

import type { GistFile } from '../utils/gist'
import { getGist } from '../utils/gist'
import { zipStr } from '../utils/zipStr'

export interface EditorProps {
  options?: ShikitorOptions
  defaultOptions?: ShikitorOptions
  /**
   * @internal
   */
  create?: typeof create
}

export default function Editor(props: EditorProps) {
  const {
    options,
    defaultOptions,
    create
  } = props

  const defaultOptionsRef = useRef(defaultOptions)
  const initialOptionsRef = useRef(Object.assign({}, defaultOptions, options))
  const shikitorRef = useRef<Shikitor | null>(null)
  const eleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    initialOptionsRef.current = Object.assign({}, defaultOptionsRef.current, options)
  }, [options])
  useEffect(() => {
    if (!eleRef.current) return
    const ele = eleRef.current

    const observer = new MutationObserver(mutationsList => {
      for (const mutation of mutationsList) {
        if (mutation.attributeName === 'style') {
          const bg = getComputedStyle(ele).backgroundColor
          const fg = getComputedStyle(ele).color
          document.documentElement.style.setProperty('--bg', bg)
          document.documentElement.style.setProperty('--fg', fg)
        }
      }
    })
    observer.observe(ele, { attributes: true, attributeFilter: ['style'] })
    const abortController = new AbortController()
    const abortSignal = abortController.signal
    create?.(ele, initialOptionsRef.current, { abort: abortSignal })
      .then(s => {
        shikitorRef.current = s
        console.log('shikitor created')
        // shikitor.focus(config.cursor?.offset)
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
      })
      .catch(e => {
        if (e instanceof Error && e.message === 'Aborted') return
        console.error(e)
      })
    return () => {
      abortController.abort()
      shikitorRef.current?.[Symbol.dispose]()
    }
  }, [create])
  useEffect(() => {
    const shikitor = shikitorRef.current
    if (!shikitor) return

    options && shikitor.updateOptions(options)
  }, [options])
  return <div ref={eleRef} />
}
