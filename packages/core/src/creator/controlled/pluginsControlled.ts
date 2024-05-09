import { derive } from 'valtio/utils'
import { snapshot, subscribe } from 'valtio/vanilla'

import type { RefObject } from '../../base'
import type { IDisposable, Shikitor, ShikitorSupportPlugin } from '../../editor'
import type { ShikitorPlugin } from '../../plugin'
import type { PickByValue } from '../../types'
import { diffArray } from '../../utils' with { 'unbundled-reexport': 'on' }
import { isSameSnapshot } from '../../utils/valtio/isSameSnapshot'

export function pluginsControlled(
  ref: RefObject<{ plugins: ShikitorPlugin[] }>,
  ee: Shikitor['ee']
) {
  let shikitor: Shikitor | undefined
  let pluginsDisposables: (void | IDisposable)[] = []
  const pluginsRef = derive({
    current: get => get(ref).current.plugins
  })
  function callAllShikitorPlugins<
    K extends Exclude<keyof PickByValue<ShikitorPlugin, (...args: any[]) => any>, undefined>
  >(method: K, ...args: Parameters<Exclude<ShikitorPlugin[K], undefined>>) {
    const plugins = pluginsRef.current
    return plugins.map(plugin => {
      let funcRT = plugin[method]?.call(
        shikitor,
        // @ts-ignore
        ...args
      )
      if (['install', 'onDispose'].includes(method)) {
        funcRT = Promise.resolve(funcRT)
          .then(rt => {
            const eventName = {
              install: 'install',
              onDispose: 'dispose'
            }[method as 'install' | 'onDispose']
            ee.emit(eventName, plugin.name, shikitor)
            return rt
          })
      }
      return funcRT
    })
  }
  let prevPluginSnapshots = snapshot(pluginsRef).current
  const dispose = subscribe(pluginsRef, async () => {
    if (!shikitor) {
      throw new Error('Shikitor instance is not provided')
    }
    const pluginSnapshots = snapshot(pluginsRef).current
    if (prevPluginSnapshots === pluginSnapshots) {
      return
    }
    const { added, reordered, removed } = diffArray(prevPluginSnapshots, pluginSnapshots, isSameSnapshot)
    for (const plugin of removed) {
      const index = prevPluginSnapshots.indexOf(plugin)
      if (index === -1) return
      pluginsDisposables[index]?.dispose?.()
      plugin.onDispose?.call(shikitor)
      ee.emit('dispose', plugin.name)
    }
    for (const plugin of removed) {
      const index = prevPluginSnapshots.indexOf(plugin)
      if (index === -1) return
      pluginsDisposables.splice(index, 1)
    }
    for (const [oldI, newI] of reordered) {
      const temp = pluginsDisposables[oldI]
      pluginsDisposables[oldI] = pluginsDisposables[newI]
      pluginsDisposables[newI] = temp
    }
    await Promise.all(
      added.map(async ([plugin, index]) => {
        if (!shikitor) {
          throw new Error('Shikitor instance is not provided')
        }

        const dispose = await plugin.install?.call(shikitor, shikitor)
        ee.emit('install', plugin.name, shikitor)
        if (index < pluginsDisposables.length) {
          pluginsDisposables.splice(index, 0, dispose)
        } else if (index === pluginsDisposables.length) {
          pluginsDisposables.push(dispose)
        } else {
          pluginsDisposables[index] = dispose
        }
      })
    )
    prevPluginSnapshots = pluginSnapshots
  })
  return {
    dispose() {
      dispose()
      pluginsDisposables
        .filter(<T>(x: T | void): x is T => x !== undefined)
        .forEach(({ dispose }) => dispose?.())
    },
    async install(instance: Shikitor) {
      shikitor = instance
      pluginsDisposables = await Promise.all(
        callAllShikitorPlugins('install', shikitor)
      )
    },
    callAllShikitorPlugins,
    shikitorSupportPlugin: <ShikitorSupportPlugin> {
      async upsertPlugin(plugin, index) {
        const p = await Promise.resolve(typeof plugin === 'function' ? plugin() : plugin)
        if (p === undefined) {
          throw new Error('Not provided plugin')
        }
        const plugins = pluginsRef.current
        const realIndex = index ?? plugins.length - 1
        if (realIndex < 0 || realIndex >= plugins.length) {
          throw new Error('Invalid index')
        }
        if (index === undefined) {
          plugins?.push(p)
        } else {
          plugins?.splice(index, 1, p)
        }
        return realIndex
      },
      async removePlugin(index) {
        const plugins = pluginsRef.current
        const p = plugins[index]
        if (p === undefined) {
          throw new Error(`Not found plugin at index ${index}`)
        }
        plugins?.splice(index, 1)
      }
    }
  }
}
