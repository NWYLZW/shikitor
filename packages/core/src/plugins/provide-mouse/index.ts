import type { ResolvedTextRange } from '../../base'
import type { IDisposable } from '../../editor'
import { definePlugin } from '../../plugin'
import type { Awaitable } from '../../types'
import { throttle } from '../../utils'

const name = 'provide-mouse'

export interface OnHoverElementContext {
  content: string
  element: Element
  raw: string
}

declare module '@shikitor/core' {
  interface ShikitorProvideMouse {
    registerMouseProvider(provider: {}): IDisposable
  }
  interface ShikitorExtends {
    'provide-mouse': ShikitorProvideMouse
  }
  interface ShikitorEventMap {
    hover(range: ResolvedTextRange, context: OnHoverElementContext): Awaitable<void>
  }
}

export default () =>
  definePlugin({
    name,
    install: shikitor => {
      const input = shikitor.element.querySelector(':scope > .shikitor-input') as HTMLTextAreaElement
      const output = shikitor.element.querySelector(':scope > .shikitor-output') as HTMLElement
      let prevOutputHoverElement: Element | null = null
      input.addEventListener(
        'mousemove',
        throttle(e => {
          input.style.pointerEvents = 'none'
          output.style.pointerEvents = 'auto'
          const outputHoverElement = document.elementFromPoint(e.clientX, e.clientY)
          input.style.pointerEvents = ''
          output.style.pointerEvents = ''
          if (outputHoverElement === prevOutputHoverElement) {
            return
          }
          prevOutputHoverElement = outputHoverElement
          if (outputHoverElement === null) {
            return
          }
          if (
            outputHoverElement.className.includes('shikitor')
            && outputHoverElement.className.includes('output')
          ) {
            return
          }

          if (!outputHoverElement?.className.includes('position')) {
            return
          }

          const offsetStr = /offset:(\d+)/
            .exec(outputHoverElement.className)
            ?.[1]
          if (!offsetStr) {
            return
          }
          const offset = Number(offsetStr)
          if (isNaN(offset)) {
            return
          }
          const [line, start, end] = /position:(\d+):(\d+),(\d+)/
            .exec(outputHoverElement.className)
            ?.slice(1)
            ?.map(Number)
            ?? []
          if (!line || !start || !end || [line, start, end].some(isNaN)) {
            return
          }

          shikitor.ee.emit('hover', {
            start: { offset, line, character: start },
            end: { offset, line, character: end }
          }, {
            content: input.value.slice(start - 1, end - 1),
            element: outputHoverElement,
            raw: input.value
          })
        }, 50)
      )
      return shikitor.extend('provide-mouse', {
        registerMouseProvider() {
          // TODO
          return {}
        }
      })
    }
  })
