export function debounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
  let timer: number
  return (...args: any[]) => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      fn(...args)
    }, delay) as unknown as number
  }
}
