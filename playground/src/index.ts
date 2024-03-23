import './index.scss'

import { create } from './editor'
import bracketMatcher from './plugins/bracket-matcher'

const container = document.querySelector<HTMLDivElement>('#container')

if (container) {
  const shikitor = create(container, {
    value: 'console.log("Hello, World!")',
    language: 'javascript',
    theme: 'github-dark',
    plugins: [bracketMatcher]
  })
}
