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
