import './index.scss'
import 'typed-query-selector'

import type { Shikitor } from '@shikitor/core'
import { create } from '@shikitor/core'
import { bundledLanguagesInfo, bundledThemesInfo } from 'shiki'

import config, { DEFAULT_CODE, hashContent, hashType } from './config'
import { getGist, type GistFile } from './utils/gist'
import { zipStr } from './utils/zipStr'

const container = document.querySelector('div#container')!

const languageSelector = document.querySelector('select#language-selector')!
const themeSelector = document.querySelector('select#theme-selector')!

languageSelector.innerHTML = bundledLanguagesInfo
  .map(lang => `<option value="${lang.id}">${lang.name}</option>`)
  .join('')
themeSelector.innerHTML = bundledThemesInfo
  .map(theme => `<option value="${theme.id}">${theme.displayName}</option>`)
  .join('')

languageSelector.addEventListener('change', () => {
  config.language = languageSelector.value as typeof config.language
  shikitor.updateLanguage(config.language)
})
themeSelector.addEventListener('change', () => {
  config.theme = themeSelector.value as typeof config.theme
  shikitor.updateOptions(old => ({ ...old, theme: config.theme }))
})

const fullscreenQueryCount = parseInt(new URLSearchParams(location.search).get('fullscreen') ?? '0')
let fullscreenCount = isNaN(fullscreenQueryCount) ? 0 : fullscreenQueryCount % 3
const card = document.querySelector('.card')!
document
  .querySelector('img#fullscreen')!
  .addEventListener('click', function () {
    fullscreenCount = (fullscreenCount + 1) % 3
    switch (fullscreenCount) {
      case 1:
        card.classList.add('fullscreen')
        break
      case 2:
        card.requestFullscreen()
        this.src = `${import.meta.env.BASE_URL}fullscreen_exit.svg`
        break
      case 0:
        card.classList.remove('fullscreen')
        document.exitFullscreen()
        this.src = `${import.meta.env.BASE_URL}fullscreen.svg`
        break
    }
  })

let shikitor: Shikitor
async function init() {
  languageSelector.value = config.language ?? 'plaintext'
  themeSelector.value = config.theme ?? 'nord'
  shikitor.focus(config.cursor?.offset)
  await shikitor.upsertPlugin({
    name: 'shikitor-saver',
    onKeydown(e) {
      if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        const code = this.value
        const url = new URL(location.href)

        let newHashStr = ''
        if (code !== DEFAULT_CODE) {
          newHashStr = `zip-code/${zipStr(code)}`
        }
        url.hash = newHashStr

        const query = new URLSearchParams()
        this.options.language
        && query.set('language', this.options.language)
        this.options.theme
        && query.set('theme', this.options.theme)
        query.set('fullscreen', String(fullscreenCount))
        url.search = query.toString()
        history.pushState(null, '', url.toString())
      }
    }
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
async function main() {
  console.log('Creating Shikitor instance')
  shikitor = await create(container, config)
  init()
}
main()

if (import.meta.hot) {
  import.meta.hot.accept('./config.ts', async newModule => {
    if (!newModule) return
    const { default: newConfig } = newModule as unknown as { default: typeof config }
    console.log('Updating Shikitor options')
    await shikitor.updateOptions(newConfig)
    await init()
  })
  import.meta.hot.accept('./editor/index.ts', async newModule => {
    if (!newModule) return
    const { create: newCreate } = newModule as unknown as { create: typeof create }

    console.log('Recreating Shikitor instance')
    shikitor.dispose()
    shikitor = await newCreate(container, config)
    init()
  })
}
