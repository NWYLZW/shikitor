import './index.scss'
import 'typed-query-selector'

import config, { hashContent, hashType } from './config'
import { create } from './editor'
import { getGist, type GistFile } from './utils'

const container = document.querySelector('div#container')!

console.log('Creating Shikitor instance')
let shikitor = create(container, config)
async function init() {
  shikitor.focus(!config.cursor ? undefined : {
    start: config.cursor.offset, end: config.cursor.offset
  })
  if (hashType === 'gist') {
    shikitor.value = '// Loading from gist...'
    const [hash, filename, revision] = hashContent.split('/')
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
init()

if (import.meta.hot) {
  import.meta.hot.accept('./config.ts', newModule => {
    if (!newModule) return
    const { default: newConfig } = newModule as unknown as { default: typeof config }
    console.log('Updating Shikitor options')
    shikitor.options = newConfig
    init()
  })
  import.meta.hot.accept('./editor/index.ts', newModule => {
    if (!newModule) return
    const { create: newCreate } = newModule as unknown as { create: typeof create }

    console.log('Recreating Shikitor instance')
    shikitor.dispose()
    shikitor = newCreate(container, config)
    init()
  })
}
