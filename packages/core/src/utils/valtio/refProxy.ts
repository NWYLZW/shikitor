import { proxy } from 'valtio/vanilla'

export const refProxy = <T>(target: T | (() => T)) => proxy<{
  current: T
}>({
  current: typeof target === 'function'
    // @ts-ignore
    ? target()
    : target
})
