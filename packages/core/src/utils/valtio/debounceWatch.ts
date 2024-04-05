import { watch } from 'valtio/utils'

import { debounce } from '../debounce'

type WatchParams = Parameters<typeof watch>
type WatchCallback = WatchParams[0]
type WatchOptions = WatchParams[1] & {
  timeout?: number
}
export function debounceWatch(
  callback: WatchCallback,
  { timeout = 5, ...options }: WatchOptions = {}
) {
  return watch(debounce(callback, timeout), options)
}
