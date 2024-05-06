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
      <div class='${prefix}__label'>${tool.label}</div>
    </div>`
  }
  return ''
}
toolItemTemplate.prefix = `${'shikitor'}-tool-item`

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
      const extendDefer = Promise.withResolvers<void>()
      const dependDispose = this.depend(['provide-popup'], shikitor => {
        const { optionsRef } = shikitor
        const languageRef = derive({
          current: get => get(optionsRef).current.language
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
            const disposeWatcher = scopeWatch(async get => {
              const language = get(languageRef).current
              if (selector !== '*' && selector !== language) return
              providerDispose?.()
              const [{ start, end }] = shikitor.selections
              const selection = shikitor.value.slice(start.offset, end.offset)
              const { tools: newTools, dispose } = await provideSelectionTools(selection) ?? {}
              providerDispose = dispose
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
        extendDefer.resolve()
        return {
          dispose() {
            disposeSelectionToolsExtend?.()
            console.log(disposeSelectionToolboxProvider)
            disposeSelectionToolboxProvider?.()
            disposeScoped()
          }
        }
      })
      await extendDefer.promise
      return {
        dispose() {
          dependDispose.dispose?.()
        }
      }
    }
  })
