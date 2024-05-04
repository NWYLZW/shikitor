export const UNSET = { __: Symbol('unset') } as const
export function isUnset<T>(value: T | typeof UNSET): value is typeof UNSET {
  return value === UNSET
}
