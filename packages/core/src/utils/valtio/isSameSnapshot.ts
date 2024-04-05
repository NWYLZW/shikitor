export function isSameSnapshot(a: unknown, b: unknown) {
  if (a === b) return true

  if (typeof a !== 'object' || typeof b !== 'object') return false
  if (a === null || b === null) return false
  const aKeys = Object.keys(a) as (keyof typeof a)[]
  const bKeys = Object.keys(b) as (keyof typeof b)[]
  if (aKeys.length !== bKeys.length) return false
  return aKeys.every(key => a[key] === b[key])
}
