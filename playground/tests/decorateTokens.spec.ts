import { describe, expect, test } from 'vitest'

import { decorateTokens } from '../src/utils/decorateTokens'

describe('decorateTokens', () => {
  test('single token and single decoration', () => {
    const tksLines = [
      [{ 'content': '123', 'offset': 0, 'color': '#E1E4E8', 'fontStyle': 0 }]
    ]
    expect(decorateTokens('123', tksLines, [
      { start: 0, end: 1, tagName: 'strong' }
    ]))
      .toStrictEqual([
        [
          { 'content': '1', 'offset': 0, 'color': '#E1E4E8', 'fontStyle': 0, 'tagName': 'strong' },
          { 'content': '23', 'offset': 1, 'color': '#E1E4E8', 'fontStyle': 0 }
        ]
      ])
    expect(decorateTokens('123', tksLines, [
      { start: 0, end: 0, tagName: 'strong' }
    ]))
      .toStrictEqual([
        [{ 'content': '123', 'offset': 0, 'color': '#E1E4E8', 'fontStyle': 0 }]
      ])
    expect(decorateTokens('123', tksLines, [
      { start: 1, end: 2, tagName: 'strong' }
    ]))
      .toStrictEqual([
        [
          { 'content': '1', 'offset': 0, 'color': '#E1E4E8', 'fontStyle': 0 },
          { 'content': '2', 'offset': 1, 'color': '#E1E4E8', 'fontStyle': 0, 'tagName': 'strong' },
          { 'content': '3', 'offset': 2, 'color': '#E1E4E8', 'fontStyle': 0 }
        ]
      ])
    expect(decorateTokens('123', tksLines, [
      { start: 0, end: 3, tagName: 'strong' }
    ]))
      .toStrictEqual([
        [
          { 'content': '123', 'offset': 0, 'color': '#E1E4E8', 'fontStyle': 0, 'tagName': 'strong' }
        ]
      ])
  })
  test('single token and multiple decorations', () => {
    const tksLines = [
      [{ 'content': '123', 'offset': 0, 'color': '#E1E4E8', 'fontStyle': 0 }]
    ]
    expect(decorateTokens('123', tksLines, [
      { start: 0, end: 1, tagName: 'strong' },
      { start: 1, end: 2, tagName: 'em' }
    ]))
      .toStrictEqual([
        [
          { 'content': '1', 'offset': 0, 'color': '#E1E4E8', 'fontStyle': 0, 'tagName': 'strong' },
          { 'content': '2', 'offset': 1, 'color': '#E1E4E8', 'fontStyle': 0, 'tagName': 'em' },
          { 'content': '3', 'offset': 2, 'color': '#E1E4E8', 'fontStyle': 0 }
        ]
      ])
  })
  test('multiple tokens and multiple decoration', () => {
    const tksLines = [
      [
        { 'content': '123', 'offset': 0, 'color': '#E1E4E8', 'fontStyle': 0 },
        { 'content': '456', 'offset': 3, 'color': '#E1E4E8', 'fontStyle': 0 }
      ]
    ]
    expect(decorateTokens('123456', tksLines, [
      { start: 0, end: 1, tagName: 'strong' },
      { start: 3, end: 4, tagName: 'em' }
    ]))
      .toStrictEqual([
        [
          { 'content': '1', 'offset': 0, 'color': '#E1E4E8', 'fontStyle': 0, 'tagName': 'strong' },
          { 'content': '23', 'offset': 1, 'color': '#E1E4E8', 'fontStyle': 0 },
          { 'content': '4', 'offset': 3, 'color': '#E1E4E8', 'fontStyle': 0, 'tagName': 'em' },
          { 'content': '56', 'offset': 4, 'color': '#E1E4E8', 'fontStyle': 0 }
        ]
      ])
  })
})
