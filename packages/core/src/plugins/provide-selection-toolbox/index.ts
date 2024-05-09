import './index.scss'

import type { IDisposable, LanguageSelector, ProviderResult } from '@shikitor/core'
import { derive } from 'valtio/utils'
import { proxy, ref, snapshot } from 'valtio/vanilla'

import { definePlugin } from '../../plugin'
import type { Nullable } from '../../types'
import { icon, isUnset, UNSET } from '../../utils' with { 'unbundled-reexport': 'on' }
import { scoped } from '../../utils/valtio/scoped'

const name = 'provide-selection-toolbox'

export type ToolInner =
  & {
    title?: string
  }
  & (
    | {
      label?: string
      icon?: string
      type?: 'button'
    }
    | {
      label?: string
      type?: 'toggle' | 'select'
    }
  )

function toolItemTemplate(tool: ToolInner) {
  const { prefix } = toolItemTemplate
  if (tool.type === 'button') {
    return `<div class='${prefix}'>
      ${tool.icon ? icon(tool.icon ?? '', `${prefix}__btn`) : ''}
      ${tool.label ? `<div class='${prefix}__label'>${tool.label}</div>` : ''}
    </div>`
  }
  return ''
}
toolItemTemplate.prefix = `${'shikitor'}-popup-selection-toolbox-item`

declare module '@shikitor/core' {
  export type Tool = ToolInner
  export interface ToolList extends IDisposable {
    tools: ToolInner[]
  }
  export interface SelectionToolsProvider {
    provideSelectionTools: (selection: string) => ProviderResult<ToolList>
  }
  export interface ShikitorProvideSelectionTools {
    registerSelectionToolsProvider: (selector: LanguageSelector, provider: SelectionToolsProvider) => IDisposable
  }
  export interface ShikitorExtends {
    'provide-selection-toolbox': ShikitorProvideSelectionTools
  }
}

export default () =>
  definePlugin({
    name,
    async install() {
      const dependDefer = Promise.withResolvers<void>()
      const dependDispose = this.depend(['provide-popup'], shikitor => {
        const { optionsRef } = shikitor
        const languageRef = derive({
          current: get => get(optionsRef).current.language
        })
        const cursorRef = derive({
          current: get => get(optionsRef).current.cursor
        })
        const { disposeScoped, scopeWatch } = scoped()
        const elementRef = proxy({ current: ref<HTMLDivElement | typeof UNSET>(UNSET) })
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
            const disposeWatcher = scopeWatch(async get => {
              const language = get(languageRef).current
              get(cursorRef).current
              if (selector !== '*' && selector !== language) return
              providerDispose?.()
              const [s0] = shikitor.selections
              if (s0 === undefined) return
              const { start, end } = s0

              const ele = elementRef.current
              if (isUnset(ele)) return

              if (start.offset === end.offset) {
                ele.style.visibility = 'hidden'
                ele.innerHTML = ''
                return
              } else {
                const selection = shikitor.value.slice(start.offset, end.offset)
                const { tools: newTools = [], dispose } = await provideSelectionTools(selection) ?? {}
                providerDispose = dispose
                const oldToolsIndexes = tools
                  .reduce((indexes, tool, index) => {
                    // @ts-expect-error
                    return tool[sym]
                      ? [...indexes, index]
                      : indexes
                  }, [] as number[])
                const removedTools = tools
                  .filter((_, index) => !oldToolsIndexes.includes(index))
                tools.length = 0
                tools.push(
                  ...removedTools,
                  ...newTools.map(tool => ({ ...tool, [sym]: true }))
                )
              }
            })
            return {
              dispose: () => disposeWatcher()
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
                ele.style.visibility = 'hidden'
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
