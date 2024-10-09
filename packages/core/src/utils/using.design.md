### case1
```ts
import { definePlugin } from './plugin'

definePlugin({
  async onInstall(unInstall) {
    using register = this.providerRegister()
    register.popupProvider({ ... })
    await unInstall
    // do other things
  }
})
// old
definePlugin({
  onInstall() {
    const popupProviderDispose = this.registerPopupProvider({ ... })
    return {
      dispose() {
        popupProviderDispose()
        // do other things
      }
    }
  }
})
```

### case2
```ts
import { definePlugin } from './plugin'

definePlugin({
  async onInstall(unInstall) {
    using watch = watchable()
    watch(get => {
      a0.style.color = get(this.theme).fgcolor
    })
    watch(get => {
      a1.style.color = get(this.theme).fgcolor
    })
    await unInstall
    // do other things
  }
})
// old
definePlugin({
  onInstall() {
    const disposes = []
    const scopedWatch = (...args) => {
      const dispose = this.watch(...args)
      disposes.push(dispose)
      return () => {
        dispose()
        disposes.splice(disposes.indexOf(dispose), 1)
      }
    }
    scopedWatch(get => {
      a0.style.color = get(this.theme).fgcolor
    })
    scopedWatch(get => {
      a1.style.color = get(this.theme).fgcolor
    })
    return {
      dispose() {
        disposes.forEach(dispose => dispose())
        // do other things
      }
    }
  }
})
```

### case3
```ts
import { definePlugin } from './plugin'

const getA = () => {
  using watch = watchable()
  watch(get => {
    a.style.color = get(this.theme).fgcolor
  })
}
definePlugin({
  async onInstall(unInstall) {
    using a = getA()
    using b = getB()
    await unInstall
    // do other things
  }
})
// old
definePlugin({
  onInstall() {
    const { dispose: disposeA, a } = getA()
    const { dispose: disposeB, b } = getB()
    return {
      dispose() {
        disposeA()
        disposeB()
        // do other things
      }
    }
  }
})
```


### case4
```ts
function create() {
  using watch = watchable()
  watch(get => {
    a.style.color = get(this.theme).fgcolor
  })
  watch(get => {
    b.style.color = get(this.theme).fgcolor
  })
  return {}
}
{
  using shikitor = create()
}
```

### case5
```tsx
function watch(deps) {
  const oldDepsRef = useRef(deps)
  return {
    [Symbol.dipose]() {
      if (isSame(deps, oldDeps)) return
      oldDeps = deps
    }
  }
}
function Foo() {
  using effect = watch([a, b])
  effect(() => {
    using _ = on('click', () => console.log('click', a))
  })
  return <div>{}</div>
}
```

