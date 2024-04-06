import { debounceSubscribe } from './debounceSubscribe'
import { debounceWatch } from './debounceWatch'

export interface Scoped {
  disposeScoped: () => void
  scopeSubscribe: typeof debounceSubscribe
  scopeWatch: typeof debounceWatch
}

export function scoped(): Scoped {
  let disposes: (() => void)[] = []
  return {
    disposeScoped() {
      disposes.forEach(dispose => dispose())
    },
    scopeSubscribe(...args) {
      const dispose = debounceSubscribe(...args)
      disposes.push(dispose)
      return () => {
        dispose()
        disposes = disposes.filter(d => d !== dispose)
      }
    },
    scopeWatch(...args) {
      const dispose = debounceWatch(...args)
      disposes.push(dispose)
      return () => {
        dispose()
        disposes = disposes.filter(d => d !== dispose)
      }
    }
  }
}
