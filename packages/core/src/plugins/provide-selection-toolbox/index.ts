import './index.scss'

import type { IDisposable, LanguageSelector, ProviderResult, ResolvedTextRange } from '@shikitor/core'
import { derive } from 'valtio/utils'
import { proxy, ref, snapshot } from 'valtio/vanilla'

import { definePlugin } from '../../plugin'
import type { Nullable } from '../../types'
import { classnames, icon, isUnset, UNSET } from '../../utils' with { 'unbundled-reexport': 'on' }
import { scoped } from '../../utils/valtio/scoped'

const name = 'provide-selection-toolbox'

const uuidSym = Symbol('uuid')

export type ToolInner =
  & {
    title?: string
  }
  & (
    | {
      label?: string
      icon?: string
      type?: 'button'
      onClick?: () => void
    }
    | {
      label?: string
      icon?: string
      type?: 'toggle'
      activated?: boolean
      onToggle?: (activated: boolean) => void
    }
    | {
      label?: string
      type?: 'select'
    }
  )

declare module '@shikitor/core' {
  export type Tool = ToolInner
  export interface ToolList extends IDisposable {
    tools: ToolInner[]
  }
  export interface SelectionToolsProvider {
    provideSelectionTools: (selectionText: string, selection: ResolvedTextRange) => ProviderResult<ToolList>
  }
  export interface ShikitorProvideSelectionTools {
    registerSelectionToolsProvider: (selector: LanguageSelector, provider: SelectionToolsProvider) => IDisposable
  }
  export interface ShikitorExtends {
    'provide-selection-toolbox': ShikitorProvideSelectionTools
  }
}

function toolItemTemplate(tool: ToolInner) {
  const { prefix } = toolItemTemplate
  if (tool.type === 'button' || tool.type === 'toggle') {
    return `<div class='${
      classnames(
        prefix,
        {
          [`${prefix}--activated`]: tool.type === 'toggle' && tool.activated
        },
        `${prefix}-button`
      )
    }' data-${prefix}-uuid='${(
      // @ts-expect-error
      tool[uuidSym]
    )}'>
      ${tool.icon ? icon(tool.icon ?? '', `${prefix}__btn`) : ''}
      ${tool.label ? `<div class='${prefix}__label'>${tool.label}</div>` : ''}
    </div>`
  }
  return ''
}
toolItemTemplate.prefix = `${'shikitor'}-popup-selection-toolbox-item`

export default () =>
  definePlugin({
    name,
    async install() {
      const dependDefer = Promise.withResolvers<void>()
      const dependDispose = this.depend(['provide-popup'], shikitor => {
        const { optionsRef, selectionsRef } = shikitor
        const languageRef = derive({
          current: get => get(optionsRef).current.language
        })
        const firstSelectionRef = derive({
          current: get => get(selectionsRef).current[0]
        })
        const { disposeScoped, scopeWatch } = scoped()
        const elementRef = proxy({ current: ref<HTMLDivElement | typeof UNSET>(UNSET) })
        const toolMap = new Map<string, ToolInner>()
        const tools = proxy<ToolInner[]>([])
        scopeWatch(get => {
          const toolsSnapshot = snapshot(get(tools))
          const element = elementRef.current
          if (isUnset(element)) return
          if (toolsSnapshot.length === 0) {
            element.style.visibility = 'hidden'
            element.innerHTML = ''
            return
          }
          element.style.visibility = 'visible'
          element.innerHTML = toolsSnapshot.map(toolItemTemplate).join('')
        })
        const disposeSelectionToolsExtend = shikitor.extend('provide-selection-toolbox', {
          registerSelectionToolsProvider(selector, provider) {
            let providerDispose: Nullable<() => void>
            const { provideSelectionTools } = provider
            const sym = Symbol('provideSelectionTools')
            const getRemovedTools = () => {
              const oldToolsIndexes = tools
                .reduce((indexes, tool, index) => {
                  toolMap.delete(
                    // @ts-expect-error
                    tool[uuidSym]
                  )
                  // @ts-expect-error
                  return tool[sym]
                    ? [...indexes, index]
                    : indexes
                }, [] as number[])
              return tools
                .filter((_, index) => !oldToolsIndexes.includes(index))
            }
            const disposeWatcher = scopeWatch(async get => {
              const language = get(languageRef).current
              const selection = get(firstSelectionRef).current
              if (selection === undefined) return
              if (selector !== '*' && selector !== language) return
              providerDispose?.()
              const { start, end } = selection

              const ele = elementRef.current
              if (isUnset(ele)) return

              if (start.offset === end.offset) {
                ele.style.visibility = 'hidden'
                ele.innerHTML = ''
                return
              } else {
                const selectionText = shikitor.value.slice(start.offset, end.offset)
                const { tools: newTools = [], dispose } = await provideSelectionTools(selectionText, selection) ?? {}
                providerDispose = dispose
                tools.length = 0
                tools.push(
                  ...getRemovedTools(),
                  ...newTools.map(tool => {
                    const uuid = Math.random().toString(36).slice(2)
                    toolMap.set(uuid, tool)
                    return {
                      [uuidSym]: uuid,
                      [sym]: true,
                      ...tool
                    }
                  })
                )
              }
            })
            return {
              dispose: () => {
                disposeWatcher()
                providerDispose?.()
                tools.length = 0
                tools.push(...getRemovedTools())
              }
            }
          }
        }).dispose
        const disposeSelectionToolboxProvider = shikitor.registerPopupProvider({
          position: 'relative',
          placement: 'top',
          target: 'selection',
          hiddenOnNoCursor: true,
          providePopups: () => ({
            dispose: () => void 0,
            popups: [{
              id: 'selection-toolbox',
              render(ele) {
                const prefix = toolItemTemplate.prefix
                ele.style.visibility = 'hidden'
                // prevent focus change
                ele.addEventListener('mousedown', e => e.preventDefault())
                ele.addEventListener('click', event => {
                  const target = (
                    event.target as HTMLElement
                  )?.closest(`div.${prefix}`) as HTMLDivElement | null
                  if (target === null) return

                  const uuid = target.dataset[
                    `${prefix}-uuid`
                      // camelcase
                      .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
                  ]
                  if (uuid) {
                    event.preventDefault()
                    event.stopPropagation()
                    const tool = toolMap.get(uuid)
                    switch (tool?.type) {
                      case 'toggle':
                        tool.onToggle?.(!tool.activated)
                        break
                      case 'button':
                        tool.onClick?.()
                        break
                    }
                  }
                })
                elementRef.current = ref(ele)
              }
            }]
          })
        }).dispose
        dependDefer.resolve()
        return {
          dispose() {
            disposeSelectionToolsExtend?.()
            disposeSelectionToolboxProvider?.()
            disposeScoped()
          }
        }
      })
      await dependDefer.promise
      return {
        dispose() {
          dependDispose.dispose?.()
        }
      }
    }
  })
