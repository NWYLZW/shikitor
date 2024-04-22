export type UpdateDispatcher<
  T,
  Args extends unknown[] = [],
  RT = void,
  ResolvedValue = T
> = (...args: [...Args, value: T | ((value: ResolvedValue) => T)]) => RT

export function callUpdateDispatcher<T, ResolvedValue = T>(value: T | ((value: ResolvedValue) => T), oldValue: ResolvedValue) {
  if (typeof value === 'function') {
    return (value as Function)(oldValue)
  } else {
    return value
  }
}
