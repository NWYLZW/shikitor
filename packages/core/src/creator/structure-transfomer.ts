import type { ShikiTransformer } from '@shikijs/core'

import { cssvar } from '../base'
import { classnames } from '../utils/classnames'

export function shikitorStructureTransformer(
  target: HTMLElement,
  cursorLine: number | null
): ShikiTransformer {
  return {
    name: 'shikitor',
    pre(ele) {
      const div = document.createElement('div')
      div.style.cssText = (ele.properties.style as string | undefined) ?? ''
      const bg = div.style.backgroundColor
      const fg = div.style.color
      target.style.setProperty(cssvar('fg-color'), fg)
      target.style.setProperty(cssvar('bg-color'), bg)
      target.style.setProperty(cssvar('caret-color'), fg)
      target.style.color = fg
      target.style.backgroundColor = bg
      target.style.cssText += ele.properties.style
    },
    code(ele) {
      const props = ele.properties as {
        class?: string
      }
      props.class = classnames(props.class, 'shikitor-output-lines')
    },
    line(ele, line) {
      const props = ele.properties as {
        'data-line'?: string
        class?: string
      }
      const isCursor = !!cursorLine && cursorLine === line
      props.class = classnames(
        props.class,
        'shikitor-output-line',
        isCursor && 'shikitor-output-line-highlighted'
      )
      props['data-line'] = String(line)
      if (isCursor && ele.children.length === 0) {
        ele.children.push({ type: 'text', value: ' ' })
      }
    },
    span(ele, line, col) {
      const props = ele.properties as {
        class?: string
        style?: string
      }
      props.class = classnames(
        props.class,
        'shikitor-output-token',
        `offset:${col}`,
        `position:${line + 1}:${col + 1}`
      )
    }
  }
}
