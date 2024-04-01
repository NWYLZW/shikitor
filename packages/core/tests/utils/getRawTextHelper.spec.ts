import { describe, expect, test } from 'vitest'

import { getRawTextHelper } from '../../src/utils/getRawTextHelper'
import { trimIndent } from '../../src/utils/trimIndent'

describe('rawTextHelper', () => {
  test('getLineEnd', () => {
    const rawTextHelper = getRawTextHelper(trimIndent(`
      a
      bb

      c
    `))
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
  test('inferLeadingSpaces', () => {
    const { inferLineLeadingSpaces } = getRawTextHelper('')
    expect(inferLineLeadingSpaces(0, 2, '')).toBe(0)
    expect(inferLineLeadingSpaces(2, 2, '1\n')).toBe(0)
    expect(inferLineLeadingSpaces(3, 2, ' 1\n')).toBe(0)
    expect(inferLineLeadingSpaces(4, 2, '  1\n')).toBe(2)
    expect(inferLineLeadingSpaces(5, 2, '   1\n')).toBe(2)
    expect(inferLineLeadingSpaces(6, 2, '    1\n')).toBe(4)
    expect(inferLineLeadingSpaces(2, 2, '[\n')).toBe(2)
    expect(inferLineLeadingSpaces(3, 2, '[ \n')).toBe(2)
  })
})
