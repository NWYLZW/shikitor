import { create } from '@shikitor/core'
import React, { forwardRef } from 'react'

import type { EditorProps, EditorRef } from './type'
import { WithoutCoreEditor } from './WithoutCoreEditor'

export const Editor = forwardRef<EditorRef, EditorProps>(function Editor(props, ref) {
  return <WithoutCoreEditor {...props} create={create} ref={ref} />
})
