export function throttle<T extends (...args: any[]) => void>(fn: T, delay: number) {
  let last = 0;
  return (...args: any[]) => {
    const now = Date.now();
    if (now - last >= delay) {
      fn(...args);
      last = now;
    }
  };
}
