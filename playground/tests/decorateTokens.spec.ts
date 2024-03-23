import { describe, expect, test } from 'vitest'

import { decorateTokens } from '../src/utils'

describe('decorateTokens', () => {
  test('single token', () => {
    const tksLines = [
      [{ "content": "123", "offset": 0, "color": "#E1E4E8", "fontStyle": 0 }]
    ]
    expect(decorateTokens('123', tksLines, [
      { start: 0, end: 1, tagName: 'strong' }
    ]))
      .toStrictEqual([
        [
          { "content": "1", "offset": 0, "color": "#E1E4E8", "fontStyle": 0, "tagName": "strong" },
          { "content": "23", "offset": 1, "color": "#E1E4E8", "fontStyle": 0 }
        ]
      ])
    expect(decorateTokens('123', tksLines, [
      { start: 0, end: 0, tagName: 'strong' }
    ]))
      .toStrictEqual([
        [{ "content": "123", "offset": 0, "color": "#E1E4E8", "fontStyle": 0 }]
      ])
    expect(decorateTokens('123', tksLines, [
      { start: 1, end: 2, tagName: 'strong' }
    ]))
      .toStrictEqual([
        [
          { "content": "1", "offset": 0, "color": "#E1E4E8", "fontStyle": 0 },
          { "content": "2", "offset": 1, "color": "#E1E4E8", "fontStyle": 0, "tagName": "strong" },
          { "content": "3", "offset": 2, "color": "#E1E4E8", "fontStyle": 0 }
        ]
      ])
    expect(decorateTokens('123', tksLines, [
      { start: 0, end: 3, tagName: 'strong' }
    ]))
      .toStrictEqual([
        [
          { "content": "123", "offset": 0, "color": "#E1E4E8", "fontStyle": 0, "tagName": "strong" }
        ]
      ])
  })
})
