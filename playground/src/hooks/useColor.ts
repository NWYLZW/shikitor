import { useEffect, useRef, useState } from 'react'

export type Color = {
  bg: string
  fg: string
}

export function useColor(
  onColorChange: (
    style: CSSStyleDeclaration,
    color: Color
  ) => void,
  restoreKeys: string[] = []
) {
  const [color, setColor] = useState<{
    bg: string
    fg: string
    [key: string]: string
  }>(() => {
    const style = document.documentElement.style
    return {
      bg: style.getPropertyValue('--bg'),
      fg: style.getPropertyValue('--fg'),
      ...restoreKeys.reduce((acc, key) => ({
        ...acc,
        [key]: style.getPropertyValue(`--${key}`)
      }), {})
    }
  })
  const initialColor = useRef(color)
  useEffect(() => {
    const { bg, fg } = color
    const style = document.documentElement.style
    style.setProperty('--bg', bg)
    style.setProperty('--fg', fg)
    onColorChange(style, color)
    return () => {
      if (!initialColor.current) return
      style.setProperty('--bg', initialColor.current.bg)
      style.setProperty('--fg', initialColor.current.fg)
      restoreKeys.forEach(key => {
        initialColor.current[key]
          && style.setProperty(`--${key}`, initialColor.current[key])
      })
    }
  }, [color, onColorChange])
  return {
    setColor
  }
}
