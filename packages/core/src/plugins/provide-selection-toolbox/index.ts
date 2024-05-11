import './index.scss'

import type {
  IDisposable,
  LanguageSelector,
  ProviderResult,
  ResolvedTextRange,
  ShikitorWithExtends
} from '@shikitor/core'
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
      type: 'button'
      onClick?: () => void
    }
    | {
      label?: string
      icon?: string
      type: 'toggle'
      activated?: boolean
      onToggle?: () => void
    }
    | {
      label?: string
      type: 'select'
      placeholder?: string
      disabled?: boolean
      activatable?: boolean
      options?: readonly {
        label: string
        icon?: string
        title?: string
        activated?: boolean
        value?: string
      }[]
      onSelect?: (value?: string, index?: number) => void
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
  if (tool.type === 'select') {
    const activatedOption = tool.options?.find(option => option.activated)
    return `<div class='${
      classnames(
        prefix,
        `${prefix}--select`,
        {
          [`${prefix}--disabled`]: tool.disabled,
          [`${prefix}--activated`]: !!activatedOption
        }
      )
    }' data-${prefix}-uuid='${(
      // @ts-expect-error
      tool[uuidSym]
    )}'>
      <div class='${prefix}__input'>
        ${activatedOption?.label ?? tool.placeholder ?? ''}
      </div>
      ${icon('expand_more', classnames(`${prefix}__input-more`))}
    </div>`
  }
  return ''
}
toolItemTemplate.prefix = `${'shikitor'}-popup-selection-toolbox-item`

function showSelector(
  shikitor: ShikitorWithExtends<'provide-popup'>,
  dom: HTMLElement,
  { activatable, options, onClose }: ToolInner & { type: 'select' } & { onClose?: () => void }
) {
  const prefix = `${'shikitor'}-popup-selector`
  const rect = dom.getBoundingClientRect()
  const close = () => {
    popupOptions.remove()
    onClose?.()
  }
  const popupOptions = shikitor.mountPopup({
    id: 'selector',
    position: 'absolute',
    width: 200,
    height: 120,
    offset: {
      left: rect.left,
      top: rect.top - 120
    },
    render(element) {
      const optionsStr = options!.map(option => {
        const { label, icon: i, title, activated, value } = option
        const optionClass = classnames(
          `${prefix}__option`,
          {
            [`${prefix}__option--activated`]: activated
          }
        )
        return `<div
          class='${optionClass}'
          ${title ? `title='${title ?? label}'` : ''}
          data-${prefix}-value='${value}'
        >
          ${activated ? icon('check', `${prefix}__option-icon`) : ''}
          ${i ? icon(i, `${prefix}__option-icon`) : ''}
          ${label}
        </div>`
      }).join('')
      element.innerHTML = `
      <div class='${(classnames(
        `${prefix}__options`,
        {
          [`${prefix}__options--activatable`]: activatable
        }
      ))}'>${optionsStr}</div>
      `
      element.addEventListener('mousedown', e => e.preventDefault())
      element.addEventListener('click', e => {
        console.log(e)
        close()
      })
    }
  })
  return {
    close
  }
}

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
        const toolStore = new Map<string, unknown>()
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
                        tool.onToggle?.()
                        break
                      case 'button':
                        tool.onClick?.()
                        break
                      case 'select': {
                        if (tool.disabled) return
                        if (tool.options === undefined || tool.options.length === 0) {
                          console.warn('No options provided')
                          return
                        }
                        if (target.dataset['open'] === 'true') {
                          const ctx = toolStore.get(uuid) as { close: () => void }
                          ctx.close()
                        } else {
                          target.dataset['open'] = 'true'
                          toolStore.set(
                            uuid,
                            showSelector(shikitor, target, {
                              ...tool,
                              onClose: () => target.dataset['open'] = 'false'
                            })
                          )
                        }
                        break
                      }
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
