import './provide-completions.scss'

import { derive } from 'valtio/utils'
import { proxy, ref, subscribe } from 'valtio/vanilla'

import { definePlugin } from '../plugin'
import { isMultipleKey } from '../utils/isMultipleKey'

export enum CompletionItemKind {
  Method = 0,
  Function = 1,
  Constructor = 2,
  Field = 3,
  Variable = 4,
  Class = 5,
  Struct = 6,
  Interface = 7,
  Module = 8,
  Property = 9,
  Event = 10,
  Operator = 11,
  Unit = 12,
  Value = 13,
  Constant = 14,
  Enum = 15,
  EnumMember = 16,
  Keyword = 17,
  Text = 18,
  Color = 19,
  File = 20,
  Reference = 21,
  Customcolor = 22,
  Folder = 23,
  TypeParameter = 24,
  User = 25,
  Issue = 26,
  Snippet = 27
}
export interface CompletionItem {
  label: string
  kind?: CompletionItemKind
  detail?: string
  documentation?: string
}

function completionItemTemplate(item: CompletionItem) {
  const prefix = `${'shikitor'}-completion-item`
  return `
    <div class="${prefix}">
      <div class="${prefix}__kind">${
        item.kind
          ? CompletionItemKind[item.kind][0]
          : 'U'
      }</div>
      <div class="${prefix}__label">${item.label}</div>
      ${item.detail ? `<div class="${prefix}__detail">${item.detail}</div>` : ''}
      ${item.documentation ? `<div class="${prefix}__documentation">${item.documentation}</div>` : ''}
    </div>
  `
}

const UNSET = { __: Symbol('unset') } as const
function isUnset<T>(value: T | typeof UNSET): value is typeof UNSET {
  return value === UNSET
}
export default () => {
  const disposes: (() => void)[] = []
  const scopeSubscribe: typeof subscribe = (...args) => {
    const dispose = subscribe(...args)
    disposes.push(dispose)
    return dispose
  }
  const displayRef = proxy({ current: false })
  const elementRef = proxy({ current: ref<HTMLDivElement | typeof UNSET>(UNSET) })

  const displayDeps = derive({
    element: get => get(elementRef).current,
    display: get => get(displayRef).current
  })
  scopeSubscribe(displayDeps, () => {
    const {
      display, element
    } = displayDeps
    if (isUnset(element)) return

    if (display) {
      element.style.visibility = 'visible'
    } else {
      element.style.visibility = 'hidden'
    }
  })

  const completions = proxy<CompletionItem[]>([])
  const completionsDeps = derive({
    element: get => get(elementRef).current,
    completions: get => get(completions)
  })
  scopeSubscribe(completionsDeps, () => {
    const {
      element, completions
    } = completionsDeps
    if (isUnset(element)) return

    const completionsContent = completions.length === 0
      // TODO set display none?
      ? 'No completions available'
      : completions.map(completionItemTemplate).join('')
    element.innerHTML = `
      ${completionsContent}
      <div class="${'shikitor'}-completions__footer">
        <div class="${'shikitor'}-completions__tooltip">
          Press <kbd>↑</kbd> <kbd>↓</kbd> to navigate, <kbd>↵</kbd> to select
        </div>
        <div class="${'shikitor'}-completions__setting">
          <button>⚙️</button>
        </div>
      </div>
    `
  })
  const selectIndexRef = proxy({ current: 0 })
  const selectIndexDeps = derive({
    element: get => get(elementRef).current,
    selectIndex: get => get(selectIndexRef).current
  })
  scopeSubscribe(selectIndexDeps, () => {
    const {
      element, selectIndex
    } = selectIndexDeps
    if (isUnset(element)) return

    const items = element.querySelectorAll(`.${'shikitor'}-completion-item`)
    items.forEach((item, index) => {
      if (index === selectIndex) {
        item.classList.add('selected')
      } else {
        item.classList.remove('selected')
      }
    })
  })
  let providePopupsResolvers: PromiseWithResolvers<void> | undefined
  return definePlugin({
    name: 'provide-completions',
    onDispose() {
      disposes.forEach(dispose => dispose())
    },
    install() {
      return this.registerPopupProvider('*', {
        position: 'relative',
        placement: 'bottom',
        target: 'cursor',
        providePopups(cursors, selections) {
          providePopupsResolvers = Promise.withResolvers()
          return {
            dispose() {
              completions.length = 0
              providePopupsResolvers?.resolve()
            },
            popups: [{
              id: 'completions-board', render: ele => elementRef.current = ref(ele)
            }]
          }
        }
      })
    },
    onKeydown(e) {
      if (displayRef.current && ['ArrowUp', 'ArrowDown', 'Enter'].includes(e.key)) {
        e.preventDefault()
        if ([e.key === 'ArrowUp', e.key === 'ArrowDown'].some(Boolean)) {
          const selectIndex = selectIndexRef.current
          const delta = e.key === 'ArrowUp' ? -1 : 1
          const deltaedIndex = selectIndex + delta
          selectIndexRef.current = deltaedIndex < 0
            ? completions.length - 1
            : deltaedIndex % completions.length
          return
        }
        return
      }
      const triggerCharacters = [
        '.'
      ]
      if (!triggerCharacters.includes(e.key) || isMultipleKey(e)) {
        displayRef.current = false
        return
      }

      displayRef.current = true
    },
    async onChange(value) {
      if (!displayRef.current) return

      const { cursor } = this
      const prevChar = value.charAt(cursor.offset - 1)
      const editorHelperTriggerReg = /[\w\d?_()[\]'"`]/
      if (editorHelperTriggerReg.test(prevChar)) {
        await providePopupsResolvers?.promise
        completions.push(...[
          {
            label: 'par',
            detail: '(expr)'
          },
          {
            label: 'var',
            detail: 'var name = expr'
          }
        ])
      }
    }
  })
}
