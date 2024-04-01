import { describe, expect, test } from 'vitest'

import { indent, outdent } from '../../../src/plugins/code-styler/dent'
import { trimIndent } from '../../../src/utils/trimIndent'

describe('indent', () => {
  test('insert indent at the beginning of the line', () => {
    expect(indent('const a = 1', [0])).toStrictEqual({
      replacement: '  ',
      range: [0, 0],
      selection: [2, 2],
      selectionMode: 'end'
    })
    const start = 'const a = 1\n '.length
    expect(indent(trimIndent(`
      const a = 1
       const b = 2
    `), [start])).toStrictEqual({
      replacement: ' ',
      range: [start, start],
      selection: [start + 1, start + 1],
      selectionMode: 'end'
    })
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
    const { replacement: r0, range: range0, selection: s0, selectionMode: m0 } = indent('const a = 1', [0, 1])
    expect(m0).toBe('select')
    expect(r0).toBe('  const a = 1')
    expect(range0).toStrictEqual([0, 11])
    expect(s0).toStrictEqual([2, 3])
    const { replacement: r1, range: range1, selection: s1, selectionMode: m1 } = indent(' const a = 1', [0, 1])
    expect(m1).toBe('select')
    expect(r1).toBe('  const a = 1')
    expect(range1).toStrictEqual([0, 12])
    expect(s1).toStrictEqual([1, 2])
    const { replacement: r2, range: range2, selection: s2, selectionMode: m2 } = indent('const a = 1', [1, 2])
    expect(m2).toBe('select')
    expect(r2).toBe('  const a = 1')
    expect(range2).toStrictEqual([0, 11])
    expect(s2).toStrictEqual([3, 4])
    // TODO
    const { replacement: r3, range: range3, selection: s3, selectionMode: m3 } = indent('const a = 1\n', [0, 'const a = 1\n'.length])
    const { replacement: r4, range: range4, selection: s4, selectionMode: m4 } = indent(trimIndent(`
      const a = 1
      const b = 2
    `), [
      'c'.length,
      'const a = 1\nc'.length
    ])
    expect(m4).toBe('select')
    expect(r4).toBe('  const a = 1\n  const b = 2')
    expect(range4).toStrictEqual([0, 23])
    expect(s4).toStrictEqual([
      '  c'.length,
      '  const a = 1\n  c'.length
    ])
  })
})
describe('outdent', () => {
  test('outdent at the beginning of the line', () => {
    expect(outdent(' const a = 1', [0])).toStrictEqual({
      replacement: 'const a = 1',
      range: [0, ' const a = 1'.length],
      selection: [0, 0],
      selectionMode: 'end'
    })
    expect(outdent('  const a = 1', [1])).toStrictEqual({
      replacement: 'const a = 1',
      range: [0, '  const a = 1'.length],
      selection: [0, 0],
      selectionMode: 'end'
    })
    expect(outdent('   const a = 1', [2])).toStrictEqual({
      replacement: ' const a = 1',
      range: [0, '   const a = 1'.length],
      selection: [0, 0],
      selectionMode: 'end'
    })
    expect(outdent('   const a = 1', [3])).toStrictEqual({
      replacement: ' const a = 1',
      range: [0, '   const a = 1'.length],
      selection: [1, 1],
      selectionMode: 'end'
    })
    expect(outdent('   const a = 1', [0])).toStrictEqual({
      replacement: ' const a = 1',
      range: [0, '   const a = 1'.length],
      selection: [0, 0],
      selectionMode: 'end'
    })
  })
  test('outdent at the middle of the line', () => {
    expect(() => outdent('const a = 1', [1])).toThrow('No outdent')

    expect(outdent(' const a = 1', [2])).toStrictEqual({
      replacement: 'const a = 1',
      range: [0, ' const a = 1'.length],
      selection: [1, 1],
      selectionMode: 'end'
    })
    expect(outdent('  const a = 1', [3])).toStrictEqual({
      replacement: 'const a = 1',
      range: [0, '  const a = 1'.length],
      selection: [1, 1],
      selectionMode: 'end'
    })
    expect(outdent('   const a = 1', [4])).toStrictEqual({
      replacement: ' const a = 1',
      range: [0, '   const a = 1'.length],
      selection: [2, 2],
      selectionMode: 'end'
    })
  })
  test('outdent at the beginning of the line when select text', () => {
    expect(outdent(' const a = 1', [0, 1])).toStrictEqual({
      replacement: 'const a = 1',
      range: [0, ' const a = 1'.length],
      selection: [0, 0],
      selectionMode: 'select'
    })
    expect(outdent(' const a = 1', [0, 2])).toStrictEqual({
      replacement: 'const a = 1',
      range: [0, ' const a = 1'.length],
      selection: [0, 1],
      selectionMode: 'select'
    })
    expect(outdent(' const a = 1', [1, 2])).toStrictEqual({
      replacement: 'const a = 1',
      range: [0, ' const a = 1'.length],
      selection: [0, 1],
      selectionMode: 'select'
    })
    expect(outdent('  const a = 1', [0, 1])).toStrictEqual({
      replacement: 'const a = 1',
      range: [0, '  const a = 1'.length],
      selection: [0, 0],
      selectionMode: 'select'
    })
    expect(outdent('  const a = 1', [0, 2])).toStrictEqual({
      replacement: 'const a = 1',
      range: [0, '  const a = 1'.length],
      selection: [0, 0],
      selectionMode: 'select'
    })
    expect(outdent('  const a = 1', [0, 3])).toStrictEqual({
      replacement: 'const a = 1',
      range: [0, '  const a = 1'.length],
      selection: [0, 1],
      selectionMode: 'select'
    })
    expect(outdent('  const a = 1', [1, 2])).toStrictEqual({
      replacement: 'const a = 1',
      range: [0, '  const a = 1'.length],
      selection: [0, 0],
      selectionMode: 'select'
    })
    expect(outdent('  const a = 1', [1, 3])).toStrictEqual({
      replacement: 'const a = 1',
      range: [0, '  const a = 1'.length],
      selection: [0, 1],
      selectionMode: 'select'
    })
    expect(outdent('  const a = 1', [2, 3])).toStrictEqual({
      replacement: 'const a = 1',
      range: [0, '  const a = 1'.length],
      selection: [0, 1],
      selectionMode: 'select'
    })
    expect(outdent('   const a = 1', [0, 1])).toStrictEqual({
      replacement: ' const a = 1',
      range: [0, '   const a = 1'.length],
      selection: [0, 0],
      selectionMode: 'select'
    })
  })
})
