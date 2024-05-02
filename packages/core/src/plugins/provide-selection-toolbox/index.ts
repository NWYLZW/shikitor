import './index.scss'

import type { IDisposable, LanguageSelector, ProviderResult } from '@shikitor/core'
import { derive } from 'valtio/utils'

import { definePlugin } from '../../plugin'
import { scoped } from '../../utils/valtio/scoped'

const name = 'provide-selection-toolbox'

export interface ToolInner {
  label?: string
  title?: string
  type?: 'button' | 'toggle' | 'select'
}

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
        const tools = []
        const disposeSelectionToolsExtend = shikitor.extend('provide-selection-toolbox', {
          registerSelectionToolsProvider(selector, provider) {
            const disposeWatcher = scopeWatch(get => {
              const language = get(languageRef).current
              if (selector !== '*' && selector !== language) return
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
                if (shikitor.language !== 'markdown') return
                ele.innerHTML = `
                  <div class='btn blob'>B</div>
                  <div class='btn italic'>I</div>
                  <div class='btn underline'>U</div>
                  <div class='btn strikethrough'>S</div>
                  <div class='btn code'>&lt;&gt;</div>
                  <div class='btn link'>a</div>
                `
              }
            }]
          })
        }).dispose
        extendDefer.resolve()
        return {
          dispose() {
            disposeSelectionToolsExtend?.()
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
