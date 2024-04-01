import { describe, expect, test } from 'vitest'

import { getRawTextHelper } from '../../src/utils/getRawTextHelper'
import { trimIndent } from '../../src/utils/trimIndent'

describe('rawTextHelper', () => {
  const rawTextHelper = getRawTextHelper(trimIndent(`
    a
    bb

    c
  `))
  test('getLineEnd', () => {
    const { lineEnd } = rawTextHelper
    expect(lineEnd(0)).toBe(1)
    expect(lineEnd(1)).toBe(1)
    expect(lineEnd(2)).toBe(4)
    expect(lineEnd(3)).toBe(4)
    expect(lineEnd(4)).toBe(4)
    expect(lineEnd(5)).toBe(5)
    expect(lineEnd(6)).toBe(7)
    expect(lineEnd(7)).toBe(7)
  })
})
