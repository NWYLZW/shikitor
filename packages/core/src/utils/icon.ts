import { classnames } from './classnames'

const prefix = `${'shikitor'}-icon`

export const icon = (text: string, classname: string | false = false) =>
  `<span class='${
    classnames(
      prefix,
      classname
    )
  }'>${text}</span>`
