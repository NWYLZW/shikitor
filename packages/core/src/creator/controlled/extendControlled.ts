import type { Shikitor, ShikitorSupportExtend } from '../../editor'

export function extendControlled(
  ee: Shikitor['ee']
) {
  const installedKeys: string[] = []
  ee.on('install', key => {
    if (!key) return
    installedKeys.push(key)
  })
  return {
    shikitorSupportExtend: <ShikitorSupportExtend> {
      extend(key, obj) {
        const properties = Object.getOwnPropertyDescriptors(obj)
        const newPropDescs: [string, PropertyDescriptor][] = []
        for (const [prop, descriptor] of Object.entries(properties)) {
          if (prop in this) {
            throw new Error(`Property "${prop}" already exists`)
          }
          newPropDescs.push([prop, descriptor])
          Object.defineProperty(this, prop, descriptor)
        }
        return {
          dispose: () => {
            // @ts-ignore
            for (const [prop] of newPropDescs) delete this[prop]
          }
        }
      },
      depend(keys, listener) {
        let installed = false
        let dependInstalledKeys = new Set<string>(installedKeys)
        let disposeListenerCaller: (() => void) | undefined
        function allKeysInstalled() {
          return keys.every(key => dependInstalledKeys.has(key))
        }
        const checkDependInstalled = (callback?: () => void) => {
          if (allKeysInstalled()) {
            disposeListenerCaller?.()
            disposeListenerCaller = (listener(this as any) ?? {}).dispose
            installed = true
            callback?.()
          }
        }
        checkDependInstalled()
        const listenPluginsInstalled = () => {
          dependInstalledKeys = new Set<string>(installedKeys)
          const offInstallListener = ee.on('install', key => {
            if (!key) return
            dependInstalledKeys.add(key)
            checkDependInstalled(() => offInstallListener?.())
          })
        }
        listenPluginsInstalled()
        const offDisposeListener = ee.on('dispose', key => {
          if (!key) return
          if (!(keys as string[]).includes(key)) return
          if (!installed) return

          installed = false
          listenPluginsInstalled()
        })
        return {
          dispose() {
            offDisposeListener?.()
            disposeListenerCaller?.()
          }
        }
      }
    }
  }
}
