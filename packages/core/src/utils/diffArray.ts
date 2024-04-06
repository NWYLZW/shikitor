interface Diff<T> {
  added: T[]
  removed: T[]
  reordered: [oldIndex: number, newIndex: number][]
}

export function diffArray<T>(base: readonly T[], newA: readonly T[], isEqual: (a: T, b: T) => boolean = (a, b) => a === b): Diff<T> {
  const diff: Diff<T> = {
    added: [],
    removed: [],
    reordered: []
  }
  if (base === newA) return diff
  if (base.length === 0) {
    diff.added = [...newA]
    return diff
  }
  if (newA.length === 0) {
    diff.removed = [...base]
    return diff
  }

  for (let i = 0; i < base.length; i++) {
    const item = base[i]
    const index = newA.findIndex(newItem => isEqual(item, newItem))
    if (index === -1) {
      diff.removed.push(item)
    } else if (index !== i) {
      diff.reordered.push([i, index])
    }
  }

  for (let i = 0; i < newA.length; i++) {
    const item = newA[i]
    const index = base.findIndex(baseItem => isEqual(item, baseItem))
    if (index === -1) {
      diff.added.push(item)
    }
  }
  return diff
}
