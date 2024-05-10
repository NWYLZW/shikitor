type ClassnameItem = string | false | undefined | null
export function classnames(...args: (ClassnameItem | { [k: string]: true | ClassnameItem })[]) {
  const classes: string[] = []
  for (const arg of args) {
    if (typeof arg === 'string') {
      if (arg === '') continue
      classes.push(arg)
    } else if (arg) {
      for (const key in arg) {
        if (arg[key]) {
          classes.push(key)
        }
      }
    }
  }
  return classes.join(' ')
}
