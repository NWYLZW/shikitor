export function isWhatBrowser(type: 'chrome'): boolean {
  return navigator.userAgent.includes('Chrome')
}
