const DOM_STYLE_PROPS = [
  'padding-top',
  'padding-bottom',
  'padding-left',
  'padding-right',
  'font-family',
  'font-weight',
  'font-size',
  'font-variant',
  'text-rendering',
  'text-transform',
  'width',
  'text-indent',
  'border-width',
  'box-sizing',
  'line-height',
  'letter-spacing'
]

export function calculateNodeSize(targetElement: HTMLElement) {
  if (typeof window === 'undefined') {
    return {
      paddingSize: 0,
      borderSize: 0,
      boxSizing: 0,
      sizingStyle: ''
    }
  }

  const style = window.getComputedStyle(targetElement)

  const boxSizing = style.getPropertyValue('box-sizing')
    || style.getPropertyValue('-moz-box-sizing')
    || style.getPropertyValue('-webkit-box-sizing')

  const paddingSize = parseFloat(style.getPropertyValue('padding-bottom'))
    + parseFloat(style.getPropertyValue('padding-top'))

  const borderSize = parseFloat(style.getPropertyValue('border-bottom-width'))
    + parseFloat(style.getPropertyValue('border-top-width'))

  const sizingStyle = DOM_STYLE_PROPS
    .map((name) => `${name}:${style.getPropertyValue(name)}`)
    .join(';')

  return {
    paddingSize,
    borderSize,
    boxSizing,
    sizingStyle
  }
}
