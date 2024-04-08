export function isMultipleKey(e: KeyboardEvent, checkShift = true) {
  return e.ctrlKey || e.altKey || e.metaKey || (e.shiftKey && checkShift)
}
