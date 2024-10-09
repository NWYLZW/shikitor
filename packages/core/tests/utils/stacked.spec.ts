import { describe, test } from 'vitest'


if (!Promise.withResolvers) {
  // @ts-ignore
  Promise.withResolvers = function <T>() {
    let resolve: (value: T) => void
    let reject: (reason?: any) => void
    const promise = new Promise<T>((res, rej) => {
      resolve = res
      reject = rej
    })
    return {
      resolve: resolve!,
      reject: reject!,
      promise
    }
  }
}
function stacked<
  T extends Disposable
>(func: (pause: Promise<void>) => Promise<T>) {
  const withResolvers = Promise.withResolvers<void>()
  const disposablePromise = func(withResolvers.promise)
  return {
    [Symbol.dispose]() {
      withResolvers.resolve()
      disposablePromise.then(disposable => disposable[Symbol.dispose]())
    },
    async [Symbol.asyncDispose]() {
      withResolvers.resolve()
      const { [Symbol.dispose]: dispose } = await disposablePromise
      dispose()
    }
  }
}

describe('using', () => {
  test('base', async () => {
    function foo() {
      console.log('using foo')
      return {
        [Symbol.dispose]() {
          console.log('dispose foo')
        }
      }
    }
    async function bar(pause: Promise<void>) {
      console.log('using bar')
      using _ = foo()
      await pause
      return {
        [Symbol.dispose]() {
          console.log('dispose bar')
        }
      }
    }
    {
      console.log('start')
      await using _ = stacked(bar)
      console.log('end')
    }
    console.log('out')
  })
})
