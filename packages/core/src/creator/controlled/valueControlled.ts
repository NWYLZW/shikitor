import { derive } from 'valtio/utils'
import { subscribe } from 'valtio/vanilla'

import type { RefObject } from '../../base'
import { getRawTextHelper } from '../../utils/getRawTextHelper'
import { listen } from '../../utils/listen'

export function valueControlled(
  input: HTMLTextAreaElement,
  ref: RefObject<{ value?: string }>,
  onChange: ((value: string) => void) | undefined
) {
  const valueRef = derive({
    current: get => get(ref).current.value ?? ''
  })
  const unSub = subscribe(valueRef, () => {
    const value = valueRef.current
    if (value !== input.value) {
      input.value = value
    }
    onChange?.(value)
  })
  const rawTextHelperRef = derive({
    current: get => getRawTextHelper(get(valueRef).current)
  })
  const off = listen(input, 'input', () => ref.current.value = input.value)
  input.value = valueRef.current
  return {
    dispose() {
      unSub()
      off()
    },
    valueRef,
    rawTextHelperRef
  }
}
