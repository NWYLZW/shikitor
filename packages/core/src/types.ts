export type OmitByValue<T, ValueType> = Pick<T, {
    [Key in keyof T]: [ValueType] extends [T[Key]] ? never : Key
}[keyof T]>
export type PickByValue<T, ValueType> = Pick<T, {
    [Key in keyof T]: [ValueType] extends [T[Key]] ? Key : never
}[keyof T]>

export type Awaitable<T> = Awaited<T> extends infer U ? U | Promise<U> : never
