import { describe, expect, test, vi } from 'vitest'

import { EventEmitter } from '../../src/editor/base.eventEmitter'

describe('EventEmitter', () => {
  test('base', async () => {
    const ee = new EventEmitter<{
      test: (msg: string) => void
    }>()
    const cb = vi.fn()
    ee.on('test', cb)
    ee.emit('test', 'hello')
    expect(cb).toHaveBeenCalledWith('hello')
    // @ts-expect-error
    ee.emit('test', 1)
    expect(cb).toHaveBeenCalledWith(1)
  })
  test('off method', async () => {
    const ee = new EventEmitter()
    const cb = vi.fn()
    ee.on('test', cb)
    ee.off('test', cb)
    ee.emit('test', 'hello')
    expect(cb).not.toHaveBeenCalled()
  })
  test('off', async () => {
    const ee = new EventEmitter()
    const cb = vi.fn()
    const off = ee.on('test', cb)
    off()
    ee.emit('test', 'hello')
    expect(cb).not.toHaveBeenCalled()
  })
  test('once', async () => {
    const ee = new EventEmitter()
    const cb = vi.fn()
    ee.once('test', cb)
    ee.emit('test', 'hello')
    expect(cb).toHaveBeenCalledWith('hello')
    ee.emit('test', 'world')
    expect(cb).toHaveBeenCalledTimes(1)
  })
})
