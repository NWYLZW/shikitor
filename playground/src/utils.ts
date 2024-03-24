interface EventEmitter {
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void
}
interface ListenOptions extends AddEventListenerOptions {
}
export function listen<K extends keyof DocumentEventMap>(
  element: Document, type: K, listener: (this: Document, ev: DocumentEventMap[K]) => any, options?: boolean | ListenOptions
): () => void
export function listen<
  Elem extends HTMLElement, EventMap extends HTMLElementEventMap, K extends keyof EventMap
>(
  element: Elem, type: K, listener: (this: Elem, ev: EventMap[K]) => any, options?: boolean | ListenOptions
): () => void
export function listen(
  element: EventEmitter, type: string, listener: (ev: Event) => any, options?: boolean | ListenOptions
): () => void {
  element.addEventListener(type, listener, options)
  return () => element.removeEventListener(type, listener, options)
}

const memoized = new WeakMap<(...args: any[]) => unknown, [arguments: any[], returnType: unknown]>()
export function lazy<Args extends unknown[], RT>(func: (...args: Args) => RT): (...args: Args) => RT {
  return (...args) => {
    const memoizedTarget = memoized.get(func)
    const [memoizedArgs = [], memoizedReturn] = memoizedTarget ?? []
    if ([
      !memoizedTarget,
      memoizedArgs.some((arg, i) => arg !== args[i]),
      memoizedReturn === undefined
    ].some(Boolean)) {
      const result = func(...args)
      memoized.set(func, [args, result])
      return result
    }
    return memoized.get(func)![1] as RT
  }
}

export function trimIndent(text: string) {
  const _lines = text.trimEnd().split('\n')
  const startIndex = _lines.findIndex(line => line !== '')
  const lines = _lines.slice(startIndex)
  const firstLine = lines[0]
  const indent = firstLine.match(/^\s*/)![0]
  return lines.map(line => line.replace(new RegExp(`^${indent}`), '')).join('\n')
}
