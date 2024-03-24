import { describe, expect, test } from 'vitest'

import { indent } from '../../../src/plugins/code-styler/dent'
import { trimIndent } from '../../../src/utils'

describe('indent', () => {
  test('insert indent at the beginning of the line', () => {
    const { replacement: r0, range: range0, selection: s0, selectionMode: m0 } = indent('const a = 1', [0])
    expect(m0).toBe('end')
    expect(r0).toBe('  ')
    expect(range0).toStrictEqual([0, 0])
    expect(s0).toStrictEqual([2, 2])

    const start = 'const a = 1\n '.length
    const { replacement: r1, range: range1, selection: s1, selectionMode: m1 } = indent(trimIndent(`
      const a = 1
       const b = 2
    `), [start])
    expect(m1).toBe('end')
    expect(r1).toBe(' ')
    expect(range1).toStrictEqual([start, start])
    expect(s1).toStrictEqual([start + 1, start + 1])
  })
  test('insert indent at the middle of the line', () => {
    const { replacement: r0, range: range0, selection: s0, selectionMode: m0 } = indent('const a = 1', [1])
    expect(m0).toBe('end')
    expect(r0).toBe(' ')
    expect(range0).toStrictEqual([1, 1])
    expect(s0).toStrictEqual([2, 2])

    const { replacement: r1, range: range1, selection: s1, selectionMode: m1 } = indent('const a = 1', [2])
    expect(m1).toBe('end')
    expect(r1).toBe('  ')
    expect(range1).toStrictEqual([2, 2])
    expect(s1).toStrictEqual([4, 4])
  })
  test('insert indent at the beginning of the line when select text', () => {
    const { replacement: r0, range: range0, selectionMode: m0 } = indent('const a = 1', [0, 1])
    expect(m0).toBe('select')
    expect(r0).toBe('  const a = 1')
    expect(range0).toStrictEqual([0, 11])
    const { replacement: r1, range: range1, selectionMode: m1 } = indent(' const a = 1', [1, 0])
    expect(m1).toBe('select')
    expect(r1).toBe('  const a = 1')
    expect(range1).toStrictEqual([0, 12])
    const { replacement: r2, range: range2, selectionMode: m2 } = indent('const a = 1', [0, 1])
    expect(m2).toBe('select')
    expect(r2).toBe('  const a = 1')
    expect(range2).toStrictEqual([0, 11])
    // TODO
    const { replacement: r3, range: range3, selectionMode: m3 } = indent('const a = 1\n', [0, 'const a = 1\n'.length])
    const { replacement: r4, range: range4, selectionMode: m4 } = indent('const a = 1\nconst b = 2', [
      'c'.length,
      'const a = 1\nc'.length
    ])
    expect(m4).toBe('select')
    expect(r4).toBe('  const a = 1\n  const b = 2')
    expect(range4).toStrictEqual([0, 23])
  })
})
