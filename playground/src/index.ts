import './index.scss'
import 'typed-query-selector'

import { bundledLanguagesInfo, bundledThemesInfo } from 'shiki'

import config, { bundledPluginsInfo, hashContent, hashType } from './config'
import { create } from './editor'
import { getGist, type GistFile } from './utils/gist'

const container = document.querySelector('div#container')!

const languageSelector = document.querySelector('select#language-selector')!
const themeSelector = document.querySelector('select#theme-selector')!
const pluginsSelector = document.querySelector('select#plugins-selector')!

languageSelector.innerHTML = bundledLanguagesInfo
  .map(lang => `<option value="${lang.id}">${lang.name}</option>`)
  .join('')
themeSelector.innerHTML = bundledThemesInfo
  .map(theme => `<option value="${theme.id}">${theme.displayName}</option>`)
  .join('')
pluginsSelector.innerHTML = bundledPluginsInfo
  .map(plugin => `<option value="${plugin.id}">${plugin.name}</option>`)
  .join('')

languageSelector.addEventListener('change', () => {
  config.language = languageSelector.value as typeof config.language
  shikitor.updateLanguage(config.language)
})
themeSelector.addEventListener('change', () => {
  config.theme = themeSelector.value as typeof config.theme
  shikitor.updateOptions({ theme: config.theme })
})
pluginsSelector.addEventListener('change', () => {
  // console.log(pluginsSelector, pluginsSelector.value)
  // const plugin = bundledPluginsInfo.find(plugin => plugin.id === pluginsSelector.value)
  // if (!plugin) return
  // plugin.module().then(({ default: plugin }) => {
  //   if (!plugin) return
  //   shikitor.updateOptions({ plugins: [plugin] })
  // })
})

console.log('Creating Shikitor instance')
let shikitor = create(container, config)
async function init() {
  languageSelector.value = config.language ?? 'plaintext'
  themeSelector.value = config.theme ?? 'nord'
  pluginsSelector.value = config.plugins?.map(plugin => plugin.name).join(',') ?? ''
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
  const observer = new MutationObserver((mutationsList, observer) => {
    for (const mutation of mutationsList) {
      if (mutation.attributeName === 'style') {
        const bg = getComputedStyle(container).backgroundColor
        const fg = getComputedStyle(container).color
        document.documentElement.style.setProperty('--bg', bg)
        document.documentElement.style.setProperty('--fg', fg)
      }
    }
  })
  observer.observe(container, { attributes: true, attributeFilter: ['style'] })
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
