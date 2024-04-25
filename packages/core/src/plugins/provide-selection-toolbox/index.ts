import './index.scss'

import { definePlugin } from '../../plugin'

const name = 'provide-selection-toolbox'
export default () =>
  definePlugin({
    name,
    async install() {
      const extendDefer = Promise.withResolvers<void>()
      const dependDisposable = this.depend(['provide-popup'], shikitor => {
        const disposePopupProvider = shikitor.registerPopupProvider({
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
            disposePopupProvider?.()
          }
        }
      })
      await extendDefer.promise
      return {
        dispose() {
          dependDisposable.dispose?.()
        }
      }
    }
  })
