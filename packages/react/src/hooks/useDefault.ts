import { useEffect, useMemo, useRef } from 'react'

export function useDefault<T>(
  v?: T,
  defaultV?: T,
  onChange?: (v: NonNullable<T>) => void
) {
  const defaultRef = useRef(defaultV)
  const isObject = useMemo(() => typeof defaultRef.current === 'object', [])
  const vRef = useRef(
    isObject
      ? Object.assign({}, defaultV, v)
      : v
  )
  useEffect(() => {
    vRef.current = isObject
      ? Object.assign({}, defaultRef.current, v)
      : v
  }, [isObject, v])
  useEffect(() => {
    if (vRef.current === void 0 || vRef.current === null) return

    if (v !== void 0 && v !== null) {
      onChange?.(vRef.current)
    }
  }, [onChange, v])

  return { vRef }
}
