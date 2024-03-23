import './index.scss'

import config from './config'
import { create } from './editor'

const container = document.querySelector<HTMLDivElement>('#container')!

console.log('Creating Shikitor instance')
const shikitor = create(container, config)

if (import.meta.hot) {
  import.meta.hot.accept('./config.ts', newModule => {
    if (!newModule) return
    const { default: newConfig } = newModule as unknown as { default: typeof config }
    shikitor.options = newConfig
  })
}
