import './index.scss'

import config from './config'
import { create } from './editor'

const container = document.querySelector<HTMLDivElement>('#container')!

console.log('Creating Shikitor instance')
let shikitor = create(container, config)
function init() {
  console.log(config.cursor)
  shikitor.focus(!config.cursor ? undefined : {
    start: config.cursor.offset, end: config.cursor.offset
  })
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
