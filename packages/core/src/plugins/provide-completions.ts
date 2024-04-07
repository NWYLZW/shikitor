import './provide-completions.scss'

import type { ResolvedPosition } from '@shikijs/core'
import type { CompletionItemProvider, LanguageSelector } from '@shikitor/core'
import { derive } from 'valtio/utils'
import { proxy, ref } from 'valtio/vanilla'

import type { IDisposable, ProviderResult } from '../editor'
import { definePlugin } from '../plugin'
import type { RawTextHelper } from '../utils/getRawTextHelper'
import { isMultipleKey } from '../utils/isMultipleKey'
import { scoped } from '../utils/valtio/scoped'

const name = 'provide-completions'

interface ShikitorProvideCompletions {
  registerCompletionItemProvider: (selector: LanguageSelector, provider: CompletionItemProvider) => IDisposable
}

declare module '@shikitor/core' {
  export interface CompletionList extends Partial<IDisposable> {
    suggestions: CompletionItem[]
  }
  export interface CompletionItemProvider {
    triggerCharacters?: string[]
    /**
     * Provide completion items for the given position and document.
     */
    provideCompletionItems(
      rawTextHelper: RawTextHelper,
      position: ResolvedPosition
    ): ProviderResult<CompletionList>
  }
  interface ShikitorExtends {
    'provide-completions': ShikitorProvideCompletions
  }
}

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
  const { disposeScoped, scopeSubscribe } = scoped()
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

  const triggerCharacter = proxy({
    current: undefined as string | undefined
  })
  const allTriggerCharacters = proxy<string[]>([])

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
    name,
    onDispose() {
      disposeScoped()
    },
    install() {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const shikitor = this
      const { optionsRef } = shikitor
      const languageRef = derive({
        current: get => get(optionsRef).current.language
      })
      const { disposeScoped, scopeWatch } = scoped()
      const disposeExtend = this.extend(name, {
        registerCompletionItemProvider(selector, provider) {
          let providerDispose: (() => void) | undefined
          const { triggerCharacters, provideCompletionItems } = provider

          const start = allTriggerCharacters.length
          const end = allTriggerCharacters.push(...triggerCharacters ?? [])
          let prevCompletions: CompletionItem[] = []
          scopeWatch(async get => {
            const char = get(triggerCharacter).current

            const language = get(languageRef).current
            if (selector !== '*' && selector !== language) return

            if (!char || !triggerCharacters?.includes(char)) return

            await providePopupsResolvers?.promise
            const { rawTextHelper, cursor } = shikitor
            providerDispose?.()
            const { suggestions = [], dispose } = await Promise.resolve(provideCompletionItems(rawTextHelper, cursor)) ?? {}
            providerDispose = dispose
            if (suggestions.length === 0) return

            const oldCompletionsIndexes = completions.reduce((indexes, completion, index) => {
              if (prevCompletions.includes(completion)) {
                return [...indexes, index]
              }
              return indexes
            }, [] as number[])
            const removedCompletions = completions
              .filter((_, index) => !oldCompletionsIndexes.includes(index))
            completions.length = 0
            completions.push(...removedCompletions, ...suggestions)
            prevCompletions = suggestions
          })
          return {
            dispose() {
              providerDispose?.()
              allTriggerCharacters.splice(start, end - start)
            }
          }
        }
      })
      const popupProviderDisposable = this.registerPopupProvider('*', {
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
      return {
        dispose() {
          disposeExtend()
          popupProviderDisposable.dispose()
          disposeScoped()
        }
      }
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
      if (!isMultipleKey(e)) {
        displayRef.current = true
        triggerCharacter.current = e.key
        return
      }

      displayRef.current = false
    }
  })
}
