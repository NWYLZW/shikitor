import { create } from './editor'

const container = document.querySelector<HTMLDivElement>('#container')

if (container) {
  const editor = create(container, {
    value: 'console.log("Hello, World!")',
    language: 'javascript',
    theme: 'github-dark'
  })
}
