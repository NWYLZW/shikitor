export type UpdateDispatcher<T, Args extends unknown[] = [], RT = void> = (...args: [...Args, value: T | ((value: T) => T)]) => RT

export function callUpdateDispatcher<T>(value: T | ((value: T) => T), oldValue: T) {
  if (typeof value === 'function') {
    return (value as Function)(oldValue)
  } else {
    return value
  }
}
