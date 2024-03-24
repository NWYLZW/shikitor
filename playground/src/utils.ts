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
