import { describe, expect, test } from 'vitest'

import { indent } from '../../../src/plugins/code-styler/dent'
import { trimIndent } from '../../../src/utils'

describe('indent', () => {
  test('insert indent in the beginning of the line', () => {
    const code = trimIndent(`
      const a = 1
       const b = 2
    `)

    const { replacement: r0, selection: s0, selectionMode: m0 } = indent(code, [0])
    expect(m0).toBe('end')
    expect(r0).toBe('  ')
    expect(s0).toStrictEqual([0, 0])
    const start = 'const a = 1'.length
      // for '\n'
      + 1
      // for ' '
      + 1
    const { replacement: r1, selection: s1, selectionMode: m1 } = indent(code, [start])
    expect(m1).toBe('end')
    expect(r1).toBe(' ')
    expect(s1).toStrictEqual([start, start])
  })
  test('insert indent in the middle of the line', () => {
    const code = trimIndent(`
      const a = 1
      const b = 2
    `)

    const { replacement: r0, selection: s0, selectionMode: m0 } = indent(code, [1])
    expect(m0).toBe('end')
    expect(r0).toBe(' ')
    expect(s0).toStrictEqual([1, 1])

    const { replacement: r1, selection: s1, selectionMode: m1 } = indent(code, [2])
    expect(m1).toBe('end')
    expect(r1).toBe('  ')
    expect(s1).toStrictEqual([2, 2])
  })
})
