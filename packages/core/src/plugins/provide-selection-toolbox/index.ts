import './index.scss'

import type { IDisposable, LanguageSelector } from '@shikitor/core'
import { derive } from 'valtio/utils'

import { definePlugin } from '../../plugin'
import { scoped } from '../../utils/valtio/scoped'

const name = 'provide-selection-toolbox'

declare module '@shikitor/core' {
  export interface SelectionToolboxProvider {
  }
  export interface ShikitorProvideSelectionToolbox {
    registerSelectionToolboxProvider: (selector: LanguageSelector, provider: SelectionToolboxProvider) => IDisposable
  }
  export interface ShikitorExtends {
    'provide-selection-toolbox': ShikitorProvideSelectionToolbox
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
