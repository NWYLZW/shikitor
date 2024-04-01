import { describe, expect, test } from 'vitest'

describe('rawTextHelper', () => {
  function getLineEnd(value: string, index: number) {
    if (index > 0 && value[index - 1] === '\n') {
      return index - 1
    }

    while (index < value.length && value[index] !== '\n' && value[index] !== '\r') {
      index++
    }
    return index
  }
  test('getLineEnd', () => {
    expect(getLineEnd('a\nb', 0)).toBe(1)
    expect(getLineEnd('a\nb', 1)).toBe(1)
    expect(getLineEnd('a\nb', 2)).toBe(3)
    expect(getLineEnd('a\nb', 3)).toBe(3)
  })
})
