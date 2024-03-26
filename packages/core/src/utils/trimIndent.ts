export function trimIndent(text: string) {
  const _lines = text.trimEnd().split('\n')
  const startIndex = _lines.findIndex(line => line !== '')
  const lines = _lines.slice(startIndex)
  const firstLine = lines[0]
  const indent = firstLine.match(/^\s*/)![0]
  return lines.map(line => line.replace(new RegExp(`^${indent}`), '')).join('\n')
}
