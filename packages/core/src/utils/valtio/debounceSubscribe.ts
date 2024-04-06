import { subscribe } from 'valtio/vanilla'

import { debounce } from '../debounce'

type SubscribeParams = Parameters<typeof subscribe>
export function debounceSubscribe(...[proxy, callback, notifyInSync, timeout = 10]: [...SubscribeParams, timeout?: number]) {
  return subscribe(proxy, debounce(callback, timeout), notifyInSync)
}
