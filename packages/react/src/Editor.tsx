import { create } from '@shikitor/core'
import type { EditorProps, EditorRef } from '@shikitor/react'
import React, { forwardRef } from 'react'

import { WithoutCoreEditor } from './WithoutCoreEditor'

export const Editor = forwardRef<EditorRef, EditorProps>(function Editor(props, ref) {
  return <WithoutCoreEditor {...props} create={create} ref={ref} />
})
