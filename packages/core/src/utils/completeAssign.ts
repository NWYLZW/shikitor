export function completeAssign<T extends object, U extends object>(target: T, source: U): T & U {
  const descriptors = Object.getOwnPropertyDescriptors(source) as Record<PropertyKey, PropertyDescriptor>
  Object
    .getOwnPropertySymbols(source)
    .forEach(sym => {
      const descriptor = Object.getOwnPropertyDescriptor(source, sym)
      if (descriptor?.enumerable) {
        descriptors[sym] = descriptor
      }
    })
  Object.defineProperties(target, descriptors)
  return target as T & U
}
