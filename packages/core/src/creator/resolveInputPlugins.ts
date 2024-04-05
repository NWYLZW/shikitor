import type { ShikitorOptions } from '../editor'
import type { ShikitorPlugin } from '../plugin'

export async function resolveInputPlugins(plugins: ShikitorOptions['plugins']): Promise<ShikitorPlugin[]> {
  const waitResolvedPlugins = await Promise.all(plugins?.map(Promise.resolve.bind(Promise)) ?? [])
  return Promise.all(
    waitResolvedPlugins
      .map(plugin => typeof plugin === 'function' ? plugin() : plugin)
  )
}
