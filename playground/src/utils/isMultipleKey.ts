export function isMultipleKey(e: KeyboardEvent) {
  return e.ctrlKey || e.altKey || e.metaKey || e.shiftKey
}
