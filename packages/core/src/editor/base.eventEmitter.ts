type Listener = (...args: any[]) => unknown

export class EventEmitter<Events extends Record<string, Listener>> {
  #map = new Map<keyof Events, Set<Listener>>()
  on<K extends keyof Events>(event: K, listener: Events[K]) {
    const listeners = this.#map.get(event) ?? new Set([listener])
    listeners.add(listener)
    this.#map.set(event, listeners)
    return () => listeners.delete(listener)
  }
  emit<K extends keyof Events>(event: K, ...args: Parameters<Events[K]>) {
    const listeners = this.#map.get(event)
    listeners?.forEach(listener => listener(...args))
  }
  off<K extends keyof Events>(event: K, listener: Events[K]) {
    const listeners = this.#map.get(event)
    listeners?.delete(listener)
  }
  once<K extends keyof Events>(event: K, listener: Events[K]) {
    const off = this.on(event, ((...args) => {
      off()
      return listener(...args)
    }) as Events[K])
  }
}
