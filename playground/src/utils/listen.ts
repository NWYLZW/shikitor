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
