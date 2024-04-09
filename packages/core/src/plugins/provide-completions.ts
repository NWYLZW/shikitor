import './provide-completions.scss'

import type { ResolvedPosition } from '@shikijs/core'
import type { LanguageSelector, Shikitor } from '@shikitor/core'
import { derive } from 'valtio/utils'
import { proxy, ref, snapshot } from 'valtio/vanilla'

import type { TextRange } from '../base'
import type { IDisposable, ProviderResult } from '../editor'
import { definePlugin } from '../plugin'
import type { RecursiveReadonly } from '../types'
import type { RawTextHelper } from '../utils/getRawTextHelper'
import { isMultipleKey } from '../utils/isMultipleKey'
import { refProxy } from '../utils/valtio/refProxy'
import { scoped } from '../utils/valtio/scoped'

const name = 'provide-completions'

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
  export interface ShikitorProvideCompletions {
    registerCompletionItemProvider: (selector: LanguageSelector, provider: CompletionItemProvider) => IDisposable
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
  range: TextRange
  insertText: string
  /**
   * @internal
   */
  additionalTextEdits?: unknown[]
}

/**
 * Split keyword by space, comma, dot and upper case.
 * ```ts
 * splitKeywords('a.b c, d') // ['a', 'b', 'c', 'd']
 * splitKeywords('aBc') // ['a', 'b', 'c']
 * ```
 * @param keyword
 */
function splitKeywords(keyword: string) {
  return keyword
    .split(/(?=[A-Z])|[\s,.]/)
    .filter(Boolean)
    .map(s => s.toLowerCase())
}

function highlightingKeyword(text: string, keywordParts: string[]) {
  const { prefix } = completionItemTemplate
  return keywordParts.reduce((prev, keyword) => {
    const index = prev.toLowerCase().indexOf(keyword)
    if (index === -1) return prev
    return prev.slice(0, index) + `<span class="${prefix}__keyword">${keyword}</span>` + prev.slice(index + keyword.length)
  }, text)
}

function completionItemTemplate(keywordParts: string[], item: RecursiveReadonly<CompletionItem>, index: number) {
  const { prefix } = completionItemTemplate
  return `
    <div class="${prefix}" data-index="${index}">
      <div class="${prefix}__kind">${
        item.kind
          ? CompletionItemKind[item.kind][0]
          : 'U'
      }</div>
      <div class="${prefix}__label">${
        highlightingKeyword(item.label, keywordParts)
      }</div>
      ${item.detail ? `<div class="${prefix}__detail">${item.detail}</div>` : ''}
      ${item.documentation ? `<div class="${prefix}__documentation">${item.documentation}</div>` : ''}
    </div>
  `
}
completionItemTemplate.prefix = `${'shikitor'}-completion-item` as const

const UNSET = { __: Symbol('unset') } as const
function isUnset<T>(value: T | typeof UNSET): value is typeof UNSET {
  return value === UNSET
}
export default () => {
  const { disposeScoped, scopeSubscribe } = scoped()
  const elementRef = proxy({ current: ref<HTMLDivElement | typeof UNSET>(UNSET) })

  const keywordRef = refProxy(undefined as -1 | string | undefined)
  const triggerCharacter = proxy({
    current: undefined as string | undefined,
    offset: undefined as number | undefined
  })
  const allTriggerCharacters = proxy<string[]>([])

  const completions = proxy<CompletionItem[]>([])
  const resolvedCompletions = derive({
    current: get => {
      const keyword = get(keywordRef).current
      const cps = snapshot(get(completions))
      if (keyword === -1) return []

      return filterCompletions(cps, keyword)
    }
  })
  const completionsDeps = derive({
    keyword: get => get(keywordRef).current,
    element: get => get(elementRef).current,
    completions: get => get(resolvedCompletions).current
  })
  scopeSubscribe(completionsDeps, () => {
    const {
      keyword,
      element, completions
    } = completionsDeps
    if (isUnset(element)) return
    const completionsSnapshot = snapshot(completions)

    const keywordStr = keyword === -1 ? '' : keyword ?? ''
    const innerCompletionItemTemplate = completionItemTemplate.bind(null, splitKeywords(keywordStr))
    const completionsContent = completionsSnapshot.length === 0
      ? 'No completions available'
      : completionsSnapshot.map(innerCompletionItemTemplate).join('')
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

  const displayRef = derive({
    current: get => get(resolvedCompletions).current.length > 0
  })
  const displayDeps = derive({
    element: get => get(elementRef).current,
    display: get => get(displayRef).current
  })
  scopeSubscribe(displayDeps, () => {
    const {
      element,
      display
    } = displayDeps
    if (isUnset(element)) return

    if (display) {
      element.style.visibility = 'visible'
    } else {
      element.style.visibility = 'hidden'
    }
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

  function resetTriggerCharacter() {
    triggerCharacter.current = undefined
    triggerCharacter.offset = undefined
  }

  function acceptCompletion(shikitor: Shikitor) {
    const completion = snapshot(completions[selectIndexRef.current])
    if (completion) {
      const keyword = keywordRef.current === -1
        ? ''
        : keywordRef.current ?? ''
      const { range, insertText } = completion
      const { rawTextHelper: { value, resolveTextRange } } = shikitor
      const resolvedRange = resolveTextRange(range)
      const prefix = value.slice(0, resolvedRange.start.offset)
      const suffix = value.slice(
        resolvedRange.end.offset
        // remove trigger character
        + 1
        // remove keyword
        + keyword.length
      )
      shikitor.value = prefix + insertText + suffix
      resetTriggerCharacter()
      setTimeout(() => {
        shikitor.focus(prefix.length + insertText.length)
      }, 0)
      return true
    }
    return false
  }
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
              if (triggerCharacter.current === undefined) {
                completions.length = 0
              }
              providePopupsResolvers?.resolve()
            },
            popups: [{
              id: 'completions-board', render: ele => {
                elementRef.current = ref(ele)
                ele.addEventListener('click', e => {
                  if (!(e.target instanceof HTMLElement))
                    return
                  const item = e.target.closest(`div.${completionItemTemplate.prefix}`)
                  if (!item) return

                  const index = parseInt(item.dataset.index ?? '')
                  if (Number.isInteger(index)) {
                    selectIndexRef.current = index
                  }
                  if (item.classList.contains('selected')) acceptCompletion(shikitor)
                })
              }
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
      if (!isMultipleKey(e) && e.key === 'Escape') {
        resetTriggerCharacter()

        keywordRef.current = -1
        return
      }
      if (
        !isMultipleKey(e)
        && displayRef.current
        && ['ArrowUp', 'ArrowDown', 'Enter'].includes(e.key)
      ) {
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
        if (e.key === 'Enter' && acceptCompletion(this)) return
        return
      }
      if (!isMultipleKey(e, false)) {
        if (allTriggerCharacters.includes(e.key)) {
          keywordRef.current = ''
          triggerCharacter.current = e.key
          triggerCharacter.offset = this.cursor.offset + 1
          return
        }
        if (triggerCharacter.current) {
          const { rawTextHelper: { value }, cursor: { offset } } = this
          const nextChar = value[offset + 1]
          try {
            const keyword = keywordRef.current === -1
              ? ''
              : keywordRef.current ?? ''
            const newKeyword = calcNewKeyword(keyword, e.key, nextChar)
            if (!/[\r|\n]$/.test(newKeyword)) {
              keywordRef.current = newKeyword
              return
            }
          } catch (e) {
            if (e !== CalcExitError)
              throw e
          }
          resetTriggerCharacter()
        }
      }
    }
  })
}

const CalcExitError = Symbol('CalcExitError')
function calcNewKeyword(keyword: string, key: string, nextChar = '') {
  switch (key) {
    case 'ArrowRight':
      return keyword + nextChar
    case 'ArrowLeft':
    case 'Backspace':
      if (keyword.length - 1 < 0)
        throw CalcExitError
      return keyword.slice(0, keyword.length - 1)
  }
  if (key.length === 1) {
    return keyword + key
  }
  return keyword
}
function filterCompletions(completions: readonly RecursiveReadonly<CompletionItem>[], keyword?: string) {
  if (!keyword || keyword === '') return completions

  return completions.filter(({ label }) => label.startsWith(keyword))
}
