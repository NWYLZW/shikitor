// https://github.com/reactjs/rfcs/blob/useevent/text/0000-useevent.md

// (!) Approximate behavior

import { useCallback, useLayoutEffect, useRef } from 'react'

export function useEvent<Fn extends Function>(handler?: Fn) {
  const handlerRef = useRef<Fn | undefined>(undefined)

  // In a real implementation, this would run before layout effects
  useLayoutEffect(() => {
    handlerRef.current = handler
  })

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(((...args: unknown[]) => {
    return handlerRef.current?.(...args)
  }) as unknown as Fn, [])
}
