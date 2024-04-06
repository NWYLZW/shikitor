import { expect, test } from 'vitest'

import { diffArray } from '../../src/utils/diffArray'

test('added', () => {
  const { removed, added, reordered } = diffArray([1, 2], [1, 2, 3])
  expect(added).toEqual([3])
  expect(removed).toEqual([])
  expect(reordered).toEqual([])
})
test('removed', () => {
  const { removed, added, reordered } = diffArray([1, 2, 3], [1, 2])
  expect(added).toEqual([])
  expect(removed).toEqual([3])
  expect(reordered).toEqual([])
})
test('reordered', () => {
  const { removed, added, reordered } = diffArray([1, 2, 3], [1, 3, 2])
  expect(added).toEqual([])
  expect(removed).toEqual([])
  expect(reordered).toEqual([[1, 2], [2, 1]])
})
test('complex', () => {
  const { removed, added, reordered } = diffArray([1, 2, 3], [1, 4, 2])
  expect(added).toEqual([4])
  expect(removed).toEqual([3])
  expect(reordered).toEqual([[1, 2]])
})
test('isEqual', () => {
  const { removed, added, reordered } = diffArray(
    [{ id: 1 }, { id: 2 }],
    [{ id: 1 }, { id: 3 }],
    (a, b) => a.id === b.id
  )
  expect(added).toEqual([{ id: 3 }])
  expect(removed).toEqual([{ id: 2 }])
  expect(reordered).toEqual([])
})
test('same', () => {
  const arr = [1, 2]
  const diff = diffArray(arr, arr)
  expect(diff.added).toEqual([])
  expect(diff.removed).toEqual([])
  expect(diff.reordered).toEqual([])

  const { removed, added, reordered } = diffArray([1, 2], [1, 2])
  expect(added).toEqual([])
  expect(removed).toEqual([])
  expect(reordered).toEqual([])
})
test('empty', () => {
  const { removed, added, reordered } = diffArray([], [])
  expect(added).toEqual([])
  expect(removed).toEqual([])
  expect(reordered).toEqual([])

  const { removed: removed1, added: added1, reordered: reordered1 } = diffArray([1], [])
  expect(added1).toEqual([])
  expect(removed1).toEqual([1])
  expect(reordered1).toEqual([])

  const { removed: removed2, added: added2, reordered: reordered2 } = diffArray([], [1])
  expect(added2).toEqual([1])
  expect(removed2).toEqual([])
  expect(reordered2).toEqual([])
})
