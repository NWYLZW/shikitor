import { describe, expect, test } from 'vitest'

import { indent } from '../../../src/plugins/code-styler/dent'
import { trimIndent } from '../../../src/utils'

describe('indent', () => {
  test('insert indent at the beginning of the line', () => {
    const code = trimIndent(`
      const a = 1
       const b = 2
    `)

    const { replacement: r0, selection: s0, selectionMode: m0 } = indent(code, [0])
    expect(m0).toBe('end')
    expect(r0).toBe('  ')
    expect(s0).toStrictEqual([0, 0])
    const start = 'const a = 1\n '.length
    const { replacement: r1, selection: s1, selectionMode: m1 } = indent(code, [start])
    expect(m1).toBe('end')
    expect(r1).toBe(' ')
    expect(s1).toStrictEqual([start, start])
  })
  test('insert indent at the middle of the line', () => {
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
  test('insert indent at the beginning of the line when select text', () => {
    const { replacement: r0, selection: s0, selectionMode: m0 } = indent('const a = 1', [0, 1])
    expect(m0).toBe('select')
    expect(r0).toBe('  const a = 1')
    expect(s0).toStrictEqual([0, 11])
    const { replacement: r1, selection: s1, selectionMode: m1 } = indent(' const a = 1', [1, 0])
    expect(m1).toBe('select')
    expect(r1).toBe('  const a = 1')
    expect(s1).toStrictEqual([0, 12])
  })
})
